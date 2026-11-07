alter table public.perfis add column if not exists dealer text;
alter table public.perfis add column if not exists email text;

update public.perfis p set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

update public.perfis set dealer = 'NICOLYMOSANG' where id = 'b5167b50-fe5e-429f-b2fe-7bf861190f30' and dealer is null;
update public.perfis set dealer = 'ALLANASAL' where id = '58267673-516d-4b01-9d27-c60a8a6c39b6' and dealer is null;
update public.perfis set dealer = 'CRISTIANESZT' where id = '45ac2ad5-cce7-4d0a-9cf8-58c2a5690777' and dealer is null;
update public.perfis set dealer = 'ANAPIL' where id = '61218e37-acdb-4e75-bc86-8a71e183bf17' and dealer is null;
update public.perfis set dealer = 'ALANYNI' where id = '70b40aa8-8b9c-4219-acd1-3f16647558fa' and dealer is null;
update public.perfis set dealer = 'LORENAAZ' where id = 'b3bc63cd-c783-482d-a2d8-c978bbd32703' and dealer is null;
update public.perfis set dealer = 'GUILHERMEHENP' where id = '6ecc4207-4078-46ca-9719-83e26cb7f87c' and dealer is null;
update public.perfis set dealer = 'ANITAH' where id = '0145aff1-9805-40ec-811c-f40dac682576' and dealer is null;
update public.perfis set dealer = 'TALITANSO' where id = '0a574cb7-71aa-493e-8d4f-7949c71abec4' and dealer is null;
update public.perfis set dealer = 'CAMILAMAC' where id = '1eab4622-a0ef-445c-9002-36dd49a05736' and dealer is null;
update public.perfis set dealer = 'LUCASORO' where id = 'f239082b-2cec-440b-b530-c59d5b19b7b7' and dealer is null;
update public.perfis set dealer = 'LARISSABTRG' where id = '3f7bf777-f5d4-4041-9dd1-b3fddf83b6a7' and dealer is null;
update public.perfis set dealer = 'FRANCINEDLS' where id = 'be200c79-0a05-439a-8575-8f88a1eb60c0' and dealer is null;
update public.perfis set dealer = 'EMILIALM' where id = '613c5992-4e73-4f7b-9506-8c589da86899' and dealer is null;
update public.perfis set dealer = 'ANAERLPS' where id = '973837fa-77b7-402b-b8b6-90569e73d26c' and dealer is null;
update public.perfis set dealer = 'NICOLLYGFP' where id = '24ba66ba-1a58-4263-95c8-eea8fed14ac1' and dealer is null;
update public.perfis set dealer = 'ANAGATI' where id = 'cd857f41-4a48-4284-af7e-569d16f9c179' and dealer is null;
update public.perfis set dealer = 'ISABELACBA' where id = 'c541b7bb-4068-4b9e-87b7-d33a6388a698' and dealer is null;
update public.perfis set dealer = 'ELLENMDSF' where id = 'dd448d7e-c65e-4a91-9cf8-f07cb3c4ab81' and dealer is null;
update public.perfis set dealer = 'GUILHERMEAAL' where id = '13f5b203-b846-482e-b322-b607ff16d3c3' and dealer is null;
update public.perfis set dealer = 'MAYARAS' where id = '13e2c547-9af5-43a5-9870-94c4b66575a9' and dealer is null;

create unique index if not exists perfis_dealer_unico on public.perfis (upper(dealer)) where dealer is not null and dealer <> '';
