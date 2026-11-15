-- Inscription libre : pseudo + mot de passe + code d'invitation.
-- Le navigateur ne garde plus le mot de passe : il reçoit un jeton de session.

create unique index mf_players_name_lower_key on public.mf_players (lower(name));

create table public.mf_sessions (
    token_hash text primary key,
    player_id uuid not null references public.mf_players (id) on delete cascade,
    created_at timestamptz not null default now()
);
create index mf_sessions_player_idx on public.mf_sessions (player_id);
alter table public.mf_sessions enable row level security;
revoke all on public.mf_sessions from anon, authenticated;

-- Une seule ligne : le code d'invitation à donner aux joueurs. Vide = inscriptions fermées.
create table public.mf_secrets (
    id boolean primary key default true check (id),
    invite_code text
);
insert into public.mf_secrets default values;
alter table public.mf_secrets enable row level security;
revoke all on public.mf_secrets from anon, authenticated;
grant select, update (invite_code) on public.mf_secrets to authenticated;
create policy "mf_secrets admin lit" on public.mf_secrets for select to authenticated
    using ((select public.mf_is_admin()));
create policy "mf_secrets admin modifie" on public.mf_secrets for update to authenticated
    using ((select public.mf_is_admin())) with check ((select public.mf_is_admin()));

-- Les joueurs s'inscrivent eux-mêmes : l'admin ne les crée plus et ne touche plus au mot de passe.
drop policy "mf_players admin ajoute" on public.mf_players;
revoke insert (name), update (code_hash) on public.mf_players from authenticated;

drop function public.mf_login(uuid, text);
drop function public.mf_my_votes(uuid, text);
drop function public.mf_vote(uuid, text, int, int, uuid);
drop function public.mf_check_code(uuid, text);

create function public.mf_new_session(p_player uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
    v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
    insert into public.mf_sessions (token_hash, player_id)
    values (encode(sha256(convert_to(v_token, 'utf8')), 'hex'), p_player);
    return v_token;
end;
$$;

create function public.mf_session_player(p_token text) returns uuid
language sql stable security definer set search_path = '' as $$
    select player_id from public.mf_sessions
    where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex');
$$;

create function public.mf_register(p_name text, p_password text, p_invite text) returns json
language plpgsql security definer set search_path = '' as $$
declare
    v_name text := btrim(coalesce(p_name, ''));
    v_invite text;
    v_id uuid;
    v_hash text;
begin
    select invite_code into v_invite from public.mf_secrets;
    if v_invite is null or btrim(v_invite) = '' then
        raise exception 'Les inscriptions sont fermées';
    end if;
    if lower(btrim(coalesce(p_invite, ''))) <> lower(btrim(v_invite)) then
        raise exception 'Code d''invitation incorrect';
    end if;
    if char_length(v_name) < 2 or char_length(v_name) > 24 then
        raise exception 'Le pseudo doit faire entre 2 et 24 caractères';
    end if;
    if char_length(coalesce(p_password, '')) < 6 or char_length(p_password) > 72 then
        raise exception 'Le mot de passe doit faire entre 6 et 72 caractères';
    end if;
    select id, code_hash into v_id, v_hash from public.mf_players where lower(name) = lower(v_name) for update;
    if v_id is not null and v_hash is not null then
        raise exception 'Ce pseudo est déjà pris';
    end if;
    if v_id is null then
        insert into public.mf_players (name, code_hash)
        values (v_name, extensions.crypt(p_password, extensions.gen_salt('bf')))
        returning id into v_id;
    else
        -- Mot de passe réinitialisé par l'admin : le joueur en choisit un nouveau.
        update public.mf_players set code_hash = extensions.crypt(p_password, extensions.gen_salt('bf')) where id = v_id;
    end if;
    return json_build_object('token', public.mf_new_session(v_id), 'id', v_id, 'name', v_name);
exception when unique_violation then
    raise exception 'Ce pseudo est déjà pris';
end;
$$;

create function public.mf_sign_in(p_name text, p_password text) returns json
language plpgsql security definer set search_path = '' as $$
declare
    v_player public.mf_players;
begin
    select * into v_player from public.mf_players where lower(name) = lower(btrim(coalesce(p_name, '')));
    if v_player.id is null or v_player.code_hash is null
       or v_player.code_hash <> extensions.crypt(coalesce(p_password, ''), v_player.code_hash) then
        raise exception 'Pseudo ou mot de passe incorrect';
    end if;
    return json_build_object('token', public.mf_new_session(v_player.id), 'id', v_player.id, 'name', v_player.name);
end;
$$;

create function public.mf_me(p_token text) returns json
language sql stable security definer set search_path = '' as $$
    select json_build_object('id', p.id, 'name', p.name)
    from public.mf_players p where p.id = public.mf_session_player(p_token);
$$;

create function public.mf_sign_out(p_token text) returns void
language sql security definer set search_path = '' as $$
    delete from public.mf_sessions
    where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex');
$$;

create function public.mf_my_votes(p_token text)
returns table (phase int, slot int, miss_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
    v_player uuid := public.mf_session_player(p_token);
begin
    if v_player is null then
        raise exception 'Session expirée, reconnectez-vous' using errcode = '28000';
    end if;
    return query
        select v.phase, v.slot, v.miss_id
        from public.mf_votes v
        join public.mf_game g on g.edition = v.edition
        where v.player_id = v_player;
end;
$$;

create function public.mf_vote(p_token text, p_phase int, p_slot int, p_miss uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
    v_player uuid := public.mf_session_player(p_token);
    v_game public.mf_game;
    v_level int;
begin
    if v_player is null then
        raise exception 'Session expirée, reconnectez-vous' using errcode = '28000';
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
    if (p_phase = 3 and v_level < 1
            and (select count(*) from public.mf_misses where edition = v_game.edition and public.mf_level(result) >= 1) >= 5)
       or (p_phase = 4 and v_level < 2
            and (select count(*) from public.mf_misses where edition = v_game.edition and public.mf_level(result) >= 2) >= 3) then
        raise exception 'Cette miss est éliminée';
    end if;
    begin
        insert into public.mf_votes (edition, player_id, phase, slot, miss_id)
        values (v_game.edition, v_player, p_phase, p_slot, p_miss)
        on conflict on constraint mf_votes_slot_key
        do update set miss_id = excluded.miss_id, updated_at = now();
    exception when unique_violation then
        raise exception 'Cette miss est déjà dans vos choix pour cette phase';
    end;
end;
$$;

-- L'admin efface le mot de passe d'un joueur, qui se réinscrit avec le même pseudo.
create function public.mf_admin_reset_password(p_player uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
    if not public.mf_is_admin() then
        raise exception 'Réservé aux administrateurs' using errcode = '42501';
    end if;
    update public.mf_players set code_hash = null where id = p_player;
    delete from public.mf_sessions where player_id = p_player;
end;
$$;

revoke execute on function public.mf_new_session(uuid), public.mf_session_player(text),
    public.mf_register(text, text, text), public.mf_sign_in(text, text), public.mf_me(text),
    public.mf_sign_out(text), public.mf_my_votes(text), public.mf_vote(text, int, int, uuid),
    public.mf_admin_reset_password(uuid) from public, anon, authenticated;
grant execute on function public.mf_register(text, text, text), public.mf_sign_in(text, text),
    public.mf_me(text), public.mf_sign_out(text), public.mf_my_votes(text),
    public.mf_vote(text, int, int, uuid) to anon, authenticated;
grant execute on function public.mf_admin_reset_password(uuid) to authenticated;
