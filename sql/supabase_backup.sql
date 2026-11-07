create table if not exists public.backups_registro (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  tipo text not null check (tipo in ('backup', 'restauracao')),
  mes text not null,
  total_agendamentos integer,
  detalhes jsonb
);

create index if not exists idx_backups_registro_criado on public.backups_registro (criado_em desc);

grant select, insert on public.backups_registro to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.backups_registro enable row level security;

drop policy if exists "backups_registro leitura admin" on public.backups_registro;
drop policy if exists "backups_registro inserir admin" on public.backups_registro;

create policy "backups_registro leitura admin" on public.backups_registro for select to authenticated
  using (public.eh_admin());

create policy "backups_registro inserir admin" on public.backups_registro for insert to authenticated
  with check (public.eh_admin());
