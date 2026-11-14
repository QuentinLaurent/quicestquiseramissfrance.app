-- Qui c'est qui sera Miss France ? — tables et fonctions, préfixées mf_ car le projet
-- Supabase est partagé avec une autre application.
--
-- Principe : le navigateur lit librement l'état du jeu, les miss et la liste des joueurs.
-- Les votes ne sont jamais lisibles directement : tout passe par des fonctions qui
-- vérifient le code personnel du joueur et la phase en cours.

create type public.mf_result as enum ('Top 15', 'Top 5', '2ème Dauphine', '1ère Dauphine', 'Miss France');

-- Une seule ligne : l'édition en cours et sa phase (1 à 4 = votes ouverts, 5 = terminé).
create table public.mf_game (
    id boolean primary key default true check (id),
    edition text not null,
    phase int not null default 1 check (phase between 1 and 5)
);
insert into public.mf_game (edition, phase) values ('2027', 1);

create table public.mf_players (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    -- Vider cette colonne permet au joueur de choisir un nouveau code.
    code_hash text,
    has_code boolean generated always as (code_hash is not null) stored,
    created_at timestamptz not null default now()
);

create table public.mf_misses (
    id uuid primary key default gen_random_uuid(),
    edition text not null,
    region text not null,
    name text not null default '',
    age int,
    work text not null default '',
    -- Nom de fichier dans le bucket miss-photos, ou URL complète.
    photo text,
    -- Résultat saisi pendant l'émission ; vide tant que la miss n'est pas qualifiée.
    result public.mf_result,
    created_at timestamptz not null default now()
);
create index mf_misses_edition_idx on public.mf_misses (edition);

create table public.mf_votes (
    id uuid primary key default gen_random_uuid(),
    edition text not null,
    player_id uuid not null references public.mf_players (id) on delete cascade,
    phase int not null check (phase between 1 and 4),
    slot int not null check (slot between 1 and 5),
    miss_id uuid not null references public.mf_misses (id) on delete cascade,
    updated_at timestamptz not null default now(),
    constraint mf_votes_slot_key unique (edition, player_id, phase, slot),
    constraint mf_votes_miss_key unique (edition, player_id, phase, miss_id)
);
create index mf_votes_miss_idx on public.mf_votes (miss_id);
create index mf_votes_player_idx on public.mf_votes (player_id);

alter table public.mf_game enable row level security;
alter table public.mf_players enable row level security;
alter table public.mf_misses enable row level security;
alter table public.mf_votes enable row level security;

revoke all on public.mf_game, public.mf_players, public.mf_misses, public.mf_votes from anon, authenticated;
grant select on public.mf_game, public.mf_misses to anon, authenticated;
grant select (id, name, has_code) on public.mf_players to anon, authenticated;

create policy "mf_game lecture publique" on public.mf_game for select to anon, authenticated using (true);
create policy "mf_misses lecture publique" on public.mf_misses for select to anon, authenticated using (true);
create policy "mf_players lecture publique" on public.mf_players for select to anon, authenticated using (true);
-- Aucune policy sur mf_votes : inaccessible hors fonctions.

create function public.mf_level(p_result public.mf_result) returns int
language sql immutable set search_path = '' as $$
    select case p_result
        when 'Miss France' then 5
        when '1ère Dauphine' then 4
        when '2ème Dauphine' then 3
        when 'Top 5' then 2
        when 'Top 15' then 1
        else 0
    end;
$$;

create function public.mf_check_code(p_player uuid, p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.mf_players
        where id = p_player and code_hash is not null
          and code_hash = extensions.crypt(p_code, code_hash)
    );
$$;

-- Première connexion : le joueur choisit son code. Ensuite il doit le redonner.
create function public.mf_login(p_player uuid, p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
    v_hash text;
    v_found boolean;
begin
    select code_hash, true into v_hash, v_found from public.mf_players where id = p_player for update;
    if v_found is null then return 'unknown'; end if;
    if v_hash is null then
        if p_code is null or p_code !~ '^[0-9]{4,8}$' then return 'invalid'; end if;
        update public.mf_players
           set code_hash = extensions.crypt(p_code, extensions.gen_salt('bf'))
         where id = p_player;
        return 'created';
    end if;
    if v_hash = extensions.crypt(coalesce(p_code, ''), v_hash) then return 'ok'; end if;
    return 'wrong';
end;
$$;

create function public.mf_my_votes(p_player uuid, p_code text)
returns table (phase int, slot int, miss_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
    if not public.mf_check_code(p_player, p_code) then
        raise exception 'Code incorrect' using errcode = '28000';
    end if;
    return query
        select v.phase, v.slot, v.miss_id
        from public.mf_votes v
        join public.mf_game g on g.edition = v.edition
        where v.player_id = p_player;
end;
$$;

create function public.mf_vote(p_player uuid, p_code text, p_phase int, p_slot int, p_miss uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
    v_game public.mf_game;
    v_level int;
begin
    if not public.mf_check_code(p_player, p_code) then
        raise exception 'Code incorrect' using errcode = '28000';
    end if;
    select * into v_game from public.mf_game;
    if p_phase is distinct from v_game.phase or v_game.phase > 4 then
        raise exception 'Cette phase de vote est fermée';
    end if;
    if p_slot is null or p_slot < 1 or p_slot > (case when p_phase = 4 then 3 else 5 end) then
        raise exception 'Case de vote invalide';
    end if;
    select public.mf_level(result) into v_level
      from public.mf_misses where id = p_miss and edition = v_game.edition;
    if v_level is null then
        raise exception 'Miss inconnue pour cette édition';
    end if;
    -- Les éliminées ne sont plus éligibles dès que les qualifiées sont saisies.
    if (p_phase = 3 and v_level < 1
            and (select count(*) from public.mf_misses where edition = v_game.edition and public.mf_level(result) >= 1) >= 5)
       or (p_phase = 4 and v_level < 2
            and (select count(*) from public.mf_misses where edition = v_game.edition and public.mf_level(result) >= 2) >= 3) then
        raise exception 'Cette miss est éliminée';
    end if;
    begin
        insert into public.mf_votes (edition, player_id, phase, slot, miss_id)
        values (v_game.edition, p_player, p_phase, p_slot, p_miss)
        on conflict on constraint mf_votes_slot_key
        do update set miss_id = excluded.miss_id, updated_at = now();
    exception when unique_violation then
        raise exception 'Cette miss est déjà dans vos choix pour cette phase';
    end;
end;
$$;

-- Classement d'une édition. Pour l'édition en cours, seules les phases clôturées comptent.
-- Barème identique à celui affiché aux joueurs (src/lib/game.ts).
create function public.mf_ranking(p_edition text)
returns table (player_id uuid, name text, p1 int, p2 int, p3 int, p4 int, tierce boolean, total int)
language sql stable security definer set search_path = '' as $$
    with lim as (
        select case when g.edition = p_edition then g.phase else 5 end as phase, g.edition
        from public.mf_game g
    ),
    scored as (
        select v.player_id, v.phase, v.slot, public.mf_level(m.result) as lvl
        from public.mf_votes v
        join public.mf_misses m on m.id = v.miss_id
        cross join lim
        where v.edition = p_edition and v.phase < lim.phase
    ),
    pts as (
        select s.player_id, s.phase,
            sum(case
                when s.lvl = 5 then 5
                when s.phase in (1, 2) and s.lvl >= 2 then 2
                when s.phase = 2 and s.lvl = 1 then 1
                when s.phase = 3 and s.lvl = 4 then 2
                when s.phase = 3 and s.lvl = 3 then 1
                when s.phase = 4 and s.lvl = 4 then 3
                when s.phase = 4 and s.lvl = 3 then 2
                else 0
            end)::int
            + case when s.phase = 4 and count(*) filter (
                    where (s.slot = 1 and s.lvl = 5) or (s.slot = 2 and s.lvl = 4) or (s.slot = 3 and s.lvl = 3)) = 3
                then 8 else 0 end as points,
            (s.phase = 4 and count(*) filter (
                    where (s.slot = 1 and s.lvl = 5) or (s.slot = 2 and s.lvl = 4) or (s.slot = 3 and s.lvl = 3)) = 3) as tierce
        from scored s
        group by s.player_id, s.phase
    )
    select p.id, p.name,
        coalesce(sum(pts.points) filter (where pts.phase = 1), 0)::int,
        coalesce(sum(pts.points) filter (where pts.phase = 2), 0)::int,
        coalesce(sum(pts.points) filter (where pts.phase = 3), 0)::int,
        coalesce(sum(pts.points) filter (where pts.phase = 4), 0)::int,
        coalesce(bool_or(pts.tierce), false),
        coalesce(sum(pts.points), 0)::int
    from public.mf_players p
    cross join lim
    left join pts on pts.player_id = p.id
    where lim.edition = p_edition
       or exists (select 1 from public.mf_votes v where v.player_id = p.id and v.edition = p_edition)
    group by p.id, p.name;
$$;

revoke execute on function public.mf_level(public.mf_result), public.mf_check_code(uuid, text),
    public.mf_login(uuid, text), public.mf_my_votes(uuid, text),
    public.mf_vote(uuid, text, int, int, uuid), public.mf_ranking(text) from public, anon, authenticated;
grant execute on function public.mf_login(uuid, text), public.mf_my_votes(uuid, text),
    public.mf_vote(uuid, text, int, int, uuid), public.mf_ranking(text) to anon, authenticated;

-- L'app suit en direct les changements de phase et la saisie des résultats.
alter publication supabase_realtime add table public.mf_game, public.mf_misses;

-- Photos des miss (lecture publique, dépôt depuis le tableau de bord Supabase).
insert into storage.buckets (id, name, public) values ('miss-photos', 'miss-photos', true)
on conflict (id) do nothing;
