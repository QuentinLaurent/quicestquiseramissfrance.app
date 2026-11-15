-- Barème dégressif : plus on parie tôt, plus un bon pronostic rapporte.
-- Niveaux (mf_level) : 5 Miss France, 4 1ère dauphine, 3 2ème dauphine, 2 Top 5, 1 Top 15.
-- Même barème que celui affiché aux joueurs (src/lib/game.ts).
create or replace function public.mf_ranking(p_edition text)
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
                when s.phase = 1 then case when s.lvl = 5 then 10 when s.lvl >= 2 then 4 when s.lvl = 1 then 1 else 0 end
                when s.phase = 2 then case when s.lvl = 5 then 8 when s.lvl >= 2 then 3 when s.lvl = 1 then 1 else 0 end
                when s.phase = 3 then case when s.lvl = 5 then 6 when s.lvl >= 3 then 3 when s.lvl = 2 then 1 else 0 end
                when s.phase = 4 then case when s.lvl = 5 then 4 when s.lvl >= 3 then 2 else 0 end
                else 0
            end)::int
            + case when s.phase = 4 and count(*) filter (
                    where (s.slot = 1 and s.lvl = 5) or (s.slot = 2 and s.lvl = 4) or (s.slot = 3 and s.lvl = 3)) = 3
                then 4 else 0 end as points,
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
