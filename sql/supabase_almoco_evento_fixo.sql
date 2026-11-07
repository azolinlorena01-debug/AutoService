create or replace function public.almoco_evento_fixo()
returns trigger
language plpgsql
as $$
begin
  if new.evento is distinct from old.evento then
    raise exception 'O número do evento não pode ser alterado.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_almoco_evento_fixo on public.almoco_itens;
create trigger trg_almoco_evento_fixo
before update on public.almoco_itens
for each row execute function public.almoco_evento_fixo();
