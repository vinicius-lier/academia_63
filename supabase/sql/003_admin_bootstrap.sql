-- 003_admin_bootstrap.sql
-- Execute manualmente apos criar o primeiro usuario admin no Auth.
-- Passos:
-- 1) Crie o usuario em Authentication > Users.
-- 2) Rode o insert abaixo com o UUID real do usuario.

insert into public.admin_users (user_id)
values ('034d5428-3855-4cac-b7a6-32c7037355e4')
on conflict (user_id) do nothing;

-- Opcional: validar se o usuario ficou admin.
-- select * from public.admin_users;
