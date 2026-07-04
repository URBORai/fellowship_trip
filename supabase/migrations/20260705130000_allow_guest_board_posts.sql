-- 開放訪客（GUEST，未登入）發表留言：
--   created_by 改為可空（訪客留言無 user id）
--   新增 guest_name 存訪客自填暱稱，二擇一必有其一
alter table board_posts alter column created_by drop not null;
alter table board_posts add column guest_name text;

alter table board_posts add constraint board_posts_author_check
  check (created_by is not null or guest_name is not null);
