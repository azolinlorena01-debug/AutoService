create or replace function public.eh_toyota()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and equipe ilike '%toyota%'
  );
$$;

create table if not exists public.almoco_itens (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  evento text not null,
  os text,
  criado_por uuid not null default auth.uid(),
  criado_por_nome text,
  responsavel_id uuid,
  responsavel_nome text,
  status text not null default 'pendente' check (status in ('pendente', 'finalizado', 'nao_finalizado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists almoco_itens_data_idx on public.almoco_itens (data);

alter table public.almoco_itens enable row level security;

drop policy if exists almoco_select on public.almoco_itens;
create policy almoco_select on public.almoco_itens for select to authenticated
  using (public.eh_toyota() or public.eh_admin());

drop policy if exists almoco_insert on public.almoco_itens;
create policy almoco_insert on public.almoco_itens for insert to authenticated
  with check ((public.eh_toyota() or public.eh_admin()) and criado_por = auth.uid());

drop policy if exists almoco_update on public.almoco_itens;
create policy almoco_update on public.almoco_itens for update to authenticated
  using (public.eh_toyota() or public.eh_admin())
  with check (public.eh_toyota() or public.eh_admin());

drop policy if exists almoco_delete on public.almoco_itens;
create policy almoco_delete on public.almoco_itens for delete to authenticated
  using (criado_por = auth.uid() or public.eh_admin());

create or replace function public.almoco_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists almoco_atualizado_em on public.almoco_itens;
create trigger almoco_atualizado_em before update on public.almoco_itens
  for each row execute function public.almoco_atualizado_em();

drop policy if exists perfis_select_toyota on public.perfis;
create policy perfis_select_toyota on public.perfis for select to authenticated
  using (public.eh_toyota() and equipe ilike '%toyota%');

do $$
begin
  alter publication supabase_realtime add table public.almoco_itens;
exception when duplicate_object then null;
end $$;
