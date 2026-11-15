-- Administration : les comptes listés dans mf_admins (comptes Supabase Auth du projet)
-- peuvent piloter le jeu, gérer les miss, les joueurs et les photos.
-- Les lignes de mf_admins s'ajoutent à la main, depuis le tableau de bord Supabase.

create table public.mf_admins (
    user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.mf_admins enable row level security;
revoke all on public.mf_admins from anon, authenticated;

create function public.mf_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.mf_admins where user_id = (select auth.uid()));
$$;
revoke execute on function public.mf_is_admin() from public;
grant execute on function public.mf_is_admin() to anon, authenticated;

grant update (edition, phase) on public.mf_game to authenticated;
grant insert, update, delete on public.mf_misses to authenticated;
-- code_hash reste illisible : l'admin peut seulement le vider pour réinitialiser un code.
grant insert (name), update (name, code_hash), delete on public.mf_players to authenticated;

create policy "mf_game admin modifie" on public.mf_game for update to authenticated
    using ((select public.mf_is_admin())) with check ((select public.mf_is_admin()));
create policy "mf_misses admin ajoute" on public.mf_misses for insert to authenticated
    with check ((select public.mf_is_admin()));
create policy "mf_misses admin modifie" on public.mf_misses for update to authenticated
    using ((select public.mf_is_admin())) with check ((select public.mf_is_admin()));
create policy "mf_misses admin supprime" on public.mf_misses for delete to authenticated
    using ((select public.mf_is_admin()));
create policy "mf_players admin ajoute" on public.mf_players for insert to authenticated
    with check ((select public.mf_is_admin()));
create policy "mf_players admin modifie" on public.mf_players for update to authenticated
    using ((select public.mf_is_admin())) with check ((select public.mf_is_admin()));
create policy "mf_players admin supprime" on public.mf_players for delete to authenticated
    using ((select public.mf_is_admin()));

create policy "miss-photos: admin écrit" on storage.objects for all to authenticated
    using (bucket_id = 'miss-photos' and (select public.mf_is_admin()))
    with check (bucket_id = 'miss-photos' and (select public.mf_is_admin()));
