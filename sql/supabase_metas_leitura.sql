drop policy if exists metas_mensais_select_todos on public.metas_mensais;
create policy metas_mensais_select_todos on public.metas_mensais
  for select to authenticated using (true);
