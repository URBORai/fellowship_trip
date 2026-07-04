-- 角色重新命名：admin → SYS_ADMIN、member → NORMAL
-- 訪客（GUEST）= 未登入狀態，不存在於 users 表，故不列入約束
-- 對應程式碼中所有 role 檢查已改為 'SYS_ADMIN'

alter table users drop constraint users_role_check;

update users set role = 'SYS_ADMIN' where role = 'admin';
update users set role = 'NORMAL' where role = 'member';

alter table users add constraint users_role_check
  check (role in ('SYS_ADMIN', 'NORMAL'));
