# TJC 板橋團契送舊出遊網站

響應式靜態網站，前端純 HTML/CSS/JS，後端 Vercel Serverless Functions，資料庫 Supabase。

## 專案結構

```
├── index.html        首頁（活動資訊）
├── schedule.html     三天行程表
├── login.html        密語登入
├── tasks.html        任務清單
├── expenses.html     財務明細與結算
├── board.html        留言板
├── admin.html        Admin 後台（需 admin role）
├── css/style.css     共用樣式
├── js/auth.js        前端認證工具
├── api/              Vercel Serverless Functions
│   ├── _supabase.js  Supabase 工具（不對外）
│   ├── auth.js       POST /api/auth
│   ├── users.js      GET /api/users
│   ├── tasks.js      GET /api/tasks
│   ├── tasks/[id].js PATCH /api/tasks/:id
│   ├── expenses.js   GET / POST /api/expenses
│   ├── expenses/[id].js  PUT / DELETE /api/expenses/:id
│   ├── board.js      GET / POST /api/board
│   ├── board/[id].js DELETE /api/board/:id
│   └── site-content.js  GET / PUT /api/site-content（首頁與行程內容）
├── schema.sql        資料庫建表 SQL
├── .env.example      環境變數範本
└── vercel.json       Vercel 設定
```

---

## Step 1：建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com) 建立新專案
2. 進入 **SQL Editor**，貼上 `schema.sql` 的內容並執行
3. 執行後手動新增使用者資料（在 SQL Editor 執行）：

```sql
INSERT INTO users (name, passphrase, role) VALUES
  ('管理員', 'your-admin-passphrase', 'admin'),
  ('小明',   'xiaoming-passphrase',   'member'),
  ('小華',   'xiaohua-passphrase',    'member');
-- 以此類推加入所有團員
```

4. 如需手動新增任務，在 SQL Editor 執行：

```sql
-- 先查詢 user_id
SELECT id, name FROM users;

-- 再新增任務
INSERT INTO tasks (user_id, title, content) VALUES
  ('（user_id）', '準備烤肉食材', '需要準備：肉類、蔬菜、醬料'),
  ('（user_id）', '帶急救包', '');
```

5. 取得以下兩個值（Settings → API）：
   - **Project URL**（即 `SUPABASE_URL`）
   - **anon public key**（即 `SUPABASE_ANON_KEY`）

---

## Step 2：本地開發

1. 複製環境變數範本：

```bash
cp .env.example .env
```

2. 編輯 `.env` 填入實際值：

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. 安裝 Vercel CLI 並啟動本地開發伺服器：

```bash
npm i -g vercel
vercel dev
```

瀏覽器開啟 `http://localhost:3000`

---

## Step 3：部署到 Vercel

### 方法 A：Vercel CLI

```bash
vercel --prod
```

首次執行會引導你連結 GitHub 或直接部署。

### 方法 B：GitHub 整合（推薦）

1. 將專案推送到 GitHub：

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的帳號/你的repo.git
git push -u origin main
```

2. 前往 [vercel.com](https://vercel.com) → Import Project → 選擇 GitHub repo
3. 設定環境變數（見下方）

---

## Step 4：設定 Vercel 環境變數

在 Vercel 專案 → Settings → **Environment Variables** 新增：

| 名稱 | 值 |
|------|-----|
| `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` secret（後端專用，絕不可出現在前端） |
| `SESSION_SECRET` | 隨機字串（建議 `openssl rand -base64 32` 產生），用於簽章登入 token |

設定完後重新部署（Deployments → Redeploy）。

---

## Auth 說明

- 登入方式：輸入密語 → `POST /api/auth` 以 bcrypt 比對 `users.passphrase_hash`
- 登入成功後後端簽發 HMAC-SHA256 token（7 天過期），前端存入 `localStorage`（`session_token`），`{ id, name, role }` 另存供畫面顯示
- 每個 API 請求帶 `Authorization: Bearer <token>`，後端以 `api/_session.js` 驗證簽章與過期時間
- API 回 401 時前端自動清除登入狀態並導回 `login.html`
- Admin 頁額外檢查 `role === 'admin'`（後端 API 亦各自驗證 role）
- 登出時清除 `localStorage`

## 首頁 / 行程內容編輯（管理員）

- 首頁（`index.html`）與行程頁（`schedule.html`）的內容存於 `site_content` 表（JSON），
  頁面內建預設內容，資料庫沒有資料時顯示預設值
- 管理員（SYS_ADMIN）登入後，兩頁會出現「✏️ 編輯」按鈕，可直接在頁面上修改：
  - 首頁：標題區、活動資訊、車輛資訊、注意事項、建議攜帶清單
  - 行程：頁面標題、每天的行程項目（可新增／刪除／排序）、新增或刪除整天
- API：`GET /api/site-content?key=home|schedule`（公開）、`PUT /api/site-content`（僅 SYS_ADMIN）
- 啟用前請先在 Supabase SQL Editor 執行
  `supabase/migrations/20260705150000_add_site_content.sql` 建立資料表

## 安全說明

此網站設計用於小型私人群組，採用以下安全措施：
- 密語以 bcrypt 雜湊儲存與比對，均在 server-side 進行
- 身分由後端簽章的 token 判定，前端無法偽造 id / role
- 修改 / 刪除操作驗證資源擁有者，ID 參數驗證 UUID 格式
- 四張資料表已開啟 RLS 且無 policy，僅後端 service_role key 可存取
- 所有輸出有 HTML escaping 防止 XSS
- `SUPABASE_SERVICE_ROLE_KEY` 與 `SESSION_SECRET` 僅存於後端環境變數，絕不可暴露在前端
