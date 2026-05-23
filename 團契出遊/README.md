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
│   └── board/[id].js DELETE /api/board/:id
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
| `SUPABASE_ANON_KEY` | `eyJ...（你的 anon key）` |

設定完後重新部署（Deployments → Redeploy）。

---

## Auth 說明

- 登入方式：輸入密語 → `POST /api/auth` 比對 Supabase `users` 表
- 登入成功後將 `{ id, name, role }` 存入 `localStorage`
- 每頁進入時檢查 `localStorage`，未登入自動導回 `login.html`
- Admin 頁額外檢查 `role === 'admin'`
- 登出時清除 `localStorage`

## 安全說明

此網站設計用於小型私人群組，採用以下安全措施：
- 密語比對在 server-side 進行
- API 端點驗證 `x-user-id` header 是否對應真實資料庫記錄
- 修改 / 刪除操作驗證資源擁有者
- 所有輸出有 HTML escaping 防止 XSS
- 請勿將 Supabase anon key 以外的 key 暴露在前端
