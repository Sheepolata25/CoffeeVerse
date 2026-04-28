-- ============================================================
-- COFFEEVERSE — Schema initial
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================


-- ------------------------------------------------------------
-- TABLE : profiles
-- Étend auth.users avec les données propres à l'appli
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  username    text        not null unique,
  avatar_url  text,
  bio         text,
  badge       text        not null default 'Explorer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
-- TRIGGER : création automatique du profil à l'inscription
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

-- Tout le monde peut lire les profils
create policy "Profils lisibles par tous"
  on public.profiles for select
  using (true);

-- Un utilisateur ne peut modifier que son propre profil
create policy "Modification du profil par son propriétaire"
  on public.profiles for update
  using (auth.uid() = id);
