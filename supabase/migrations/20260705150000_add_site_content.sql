-- 網站內容表：儲存首頁與行程頁的可編輯內容（JSON）
-- 請在 Supabase SQL Editor 手動貼上執行
--
-- 說明：
--   - 前端頁面內建預設內容，此表沒有資料時顯示預設值，
--     管理員第一次儲存後即以此表內容為準（upsert）
--   - 與其他表相同：開啟 RLS 且不建立任何 policy，
--     僅後端 Serverless Functions 以 service_role key 存取

create table if not exists site_content (
  key text primary key check (key in ('home', 'schedule')),
  content jsonb not null,
  updated_at timestamptz default now()
);

alter table site_content enable row level security;
