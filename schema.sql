-- TJC板橋團契送舊出遊 — 資料庫 Schema
-- 請在 Supabase SQL Editor 執行此檔案

create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  passphrase text not null unique,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  title text not null,
  content text default '',
  status text not null default 'pending' check (status in ('pending', 'done')),
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references users(id) on delete cascade not null,
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists board_posts (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- 關閉 Row Level Security（授權邏輯在 Serverless Functions 處理）
alter table users disable row level security;
alter table tasks disable row level security;
alter table expenses disable row level security;
alter table board_posts disable row level security;

-- 範例資料（請修改成實際名單與密語後取消註解執行）
-- insert into users (name, passphrase, role) values
--   ('管理員', 'admin-2025', 'admin'),
--   ('小明', 'xiaoming2025', 'member'),
--   ('小華', 'xiaohua2025', 'member');
