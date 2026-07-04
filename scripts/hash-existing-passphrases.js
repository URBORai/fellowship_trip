// 一次性腳本：把 users.passphrase 明文密語雜湊後寫入 users.passphrase_hash
//
// 使用前提：
//   supabase/migrations/20260703055323_add_passphrase_hash_and_rls.sql
//   已經在 Supabase SQL Editor 手動執行過（passphrase_hash 欄位已存在）
//
// 使用方式（PowerShell）：
//   $env:SUPABASE_URL = "https://xxx.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "..."
//   node scripts/hash-existing-passphrases.js
//
// 這支腳本只會被生成，不會自動執行。

const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 環境變數，請先設定後再執行。');
    process.exit(1);
  }

  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?select=id,name,passphrase,passphrase_hash`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`
      }
    }
  );

  if (!listRes.ok) {
    console.error('讀取 users 失敗:', listRes.status, await listRes.text());
    process.exit(1);
  }

  const users = await listRes.json();
  console.log(`共 ${users.length} 位使用者，開始雜湊處理...\n`);

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of users) {
    if (u.passphrase_hash) {
      console.log(`[略過] ${u.name} (${u.id}) — 已經有 passphrase_hash`);
      skipped++;
      continue;
    }
    if (!u.passphrase) {
      console.log(`[警告] ${u.name} (${u.id}) — 沒有 passphrase 欄位值，無法雜湊`);
      failed++;
      continue;
    }

    const hash = await bcrypt.hash(u.passphrase, 10);

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${u.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ passphrase_hash: hash })
    });

    if (!patchRes.ok) {
      console.error(`[失敗] ${u.name} (${u.id}) 寫入失敗:`, patchRes.status, await patchRes.text());
      failed++;
      continue;
    }

    console.log(`[完成] ${u.name} (${u.id})`);
    done++;
  }

  console.log(`\n處理結束：完成 ${done}，略過 ${skipped}，失敗 ${failed}（共 ${users.length} 位）`);
  if (failed > 0) {
    console.log('請檢查上面標示 [失敗] 或 [警告] 的使用者，確認 passphrase_hash 是否都已補齊再繼續下一步。');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('腳本執行失敗:', e);
  process.exit(1);
});
