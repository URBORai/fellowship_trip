-- 新增 passphrase_hash 欄位，並開啟四張表的 Row Level Security
-- 注意：此檔案只生成，不會自動執行 —— 請在 Supabase SQL Editor 手動貼上執行並驗證
--
-- 執行前提／順序：
--   1. 先執行本檔案（新增欄位 + 開啟 RLS，此時尚未有任何 policy）
--   2. 確認後端 api/_supabase.js 已改用 SUPABASE_SERVICE_ROLE_KEY（service_role 會繞過 RLS，
--      anon key 之後對這四張表將完全無法存取，因為刻意不建立任何 policy）
--   3. 執行 scripts/hash-existing-passphrases.js 把現有明文 passphrase 雜湊寫入 passphrase_hash
--   4. 確認 users.passphrase_hash 全部有值後，才能考慮日後移除 users.passphrase 明文欄位

alter table users add column passphrase_hash text;

alter table users enable row level security;
alter table tasks enable row level security;
alter table expenses enable row level security;
alter table board_posts enable row level security;

-- 刻意不建立任何 CREATE POLICY：
-- 權限判斷交由後端 Serverless Functions（使用 service_role key）處理，
-- 前端／anon key 從此完全連不到這四張表。
