create extension if not exists pgcrypto;

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null check (icon in ('person','home','car','list')),
  creator_addr text not null,
  currencies text[] not null default array['NIM'],
  invite_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  address text not null,
  name text not null,
  joined_at timestamptz not null default now(),
  unique (group_id, address)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  description text not null,
  amount numeric not null,
  currency text not null,
  paid_by text not null,
  split text not null check (split in ('equal','percentage','fixed')),
  shares jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  from_addr text not null,
  to_addr text not null,
  amount numeric not null,
  currency text not null,
  tx_hash text,
  tag text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table auth_challenges (
  address text not null,
  nonce text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  primary key (address, nonce)
);

-- adresse Nimiq de l'appelant, depuis le claim sub du JWT
create or replace function current_addr() returns text
language sql stable as $$ select auth.jwt() ->> 'sub' $$;

create or replace function is_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.group_id = g and m.address = current_addr())
$$;

-- Used in members_insert_creator policy: bypasses RLS on groups so the creator
-- can add themselves as first member before they are in the members table.
create or replace function is_group_creator(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups gr where gr.id = g and gr.creator_addr = current_addr())
$$;

alter table groups enable row level security;
alter table members enable row level security;
alter table expenses enable row level security;
alter table payments enable row level security;
alter table auth_challenges enable row level security; -- aucune policy = service_role only

create policy groups_select on groups for select using (is_member(id));
create policy groups_insert on groups for insert with check (creator_addr = current_addr());

create policy members_select on members for select using (is_member(group_id));
create policy members_insert_creator on members for insert
  with check (is_group_creator(group_id));

create policy expenses_all on expenses for all
  using (is_member(group_id)) with check (is_member(group_id));

create policy payments_select on payments for select using (is_member(group_id));
create policy payments_insert on payments for insert
  with check (is_member(group_id) and from_addr = current_addr());

-- Grant object-level permissions to authenticated role (RLS handles row-level access)
grant select, insert, update, delete on groups to authenticated;
grant select, insert, update, delete on members to authenticated;
grant select, insert, update, delete on expenses to authenticated;
grant select, insert, update, delete on payments to authenticated;
-- auth_challenges: no grant to authenticated; service_role only via RLS-disabled path
