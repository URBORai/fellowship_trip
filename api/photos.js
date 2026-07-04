const { sb } = require('./_supabase');
const { getAuthUser } = require('./_session');

// 照片任務：每人固定 3 格（slot 1~3），路徑 {userId}/slot-{n}，
// 檔案由瀏覽器直傳 Supabase Storage（Vercel API 有 4.5MB 上限，10MB 照片不能過後端），
// 後端只負責發簽名上傳網址與刪除。
const BUCKET = 'photos';

async function storage(path, opts = {}) {
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1${path}`, {
    ...opts,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      // 沒有 body 的請求（如 DELETE）不能帶 Content-Type: json，Storage 伺服器會回 400
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* 非 JSON 回應 */ }
  if (!res.ok) throw new Error((data && data.message) || `storage error ${res.status}`);
  return data;
}

async function listUserSlots(userId) {
  const items = await storage(`/object/list/${BUCKET}`, {
    method: 'POST',
    body: JSON.stringify({ prefix: userId, limit: 10 })
  });
  const slots = {};
  (items || []).forEach(o => {
    const m = /^slot-([1-3])$/.exec(o.name);
    if (m) {
      // updated_at 當快取參數：更換照片後網址改變，瀏覽器才會抓新圖
      slots[m[1]] = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${userId}/${o.name}?v=${encodeURIComponent(o.updated_at || '')}`;
    }
  });
  return slots;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try {
    user = getAuthUser(req);
  } catch (e) {
    console.error('session error:', e.message);
    return res.status(500).json({ error: '伺服器設定錯誤，請聯絡管理員' });
  }
  if (!user) return res.status(401).json({ error: '請先登入' });

  // 查詢：自己的三格；?all=1 為管理員總覽（所有人的繳交狀況）
  if (req.method === 'GET') {
    try {
      if (req.query && req.query.all) {
        if (user.role !== 'SYS_ADMIN') return res.status(403).json({ error: '僅管理員可查看' });
        const users = await sb('users?select=id,name,role&order=name.asc');
        const result = [];
        for (const u of users) {
          result.push({ id: u.id, name: u.name, role: u.role, slots: await listUserSlots(u.id) });
        }
        return res.status(200).json(result);
      }
      return res.status(200).json({ slots: await listUserSlots(user.id) });
    } catch (e) {
      console.error('photos GET error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  // 取得簽名上傳網址（上傳與更換都走這裡，x-upsert 覆蓋舊檔）
  if (req.method === 'POST') {
    const { slot } = req.body || {};
    if (![1, 2, 3].includes(Number(slot))) {
      return res.status(400).json({ error: '無效的照片格編號' });
    }
    try {
      const data = await storage(`/object/upload/sign/${BUCKET}/${user.id}/slot-${slot}`, {
        method: 'POST',
        headers: { 'x-upsert': 'true' },
        body: '{}'
      });
      return res.status(200).json({ uploadUrl: `${process.env.SUPABASE_URL}/storage/v1${data.url}` });
    } catch (e) {
      console.error('photos sign error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  // 刪除自己某一格的照片
  if (req.method === 'DELETE') {
    const slot = Number((req.query && req.query.slot) || 0);
    if (![1, 2, 3].includes(slot)) {
      return res.status(400).json({ error: '無效的照片格編號' });
    }
    try {
      await storage(`/object/${BUCKET}/${user.id}/slot-${slot}`, { method: 'DELETE' });
      return res.status(204).end();
    } catch (e) {
      console.error('photos DELETE error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
