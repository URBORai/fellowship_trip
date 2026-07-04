const bcrypt = require('bcryptjs');
const { sb } = require('./_supabase');
const { getAuthUser } = require('./_session');

const VALID_ROLES = ['NORMAL', 'SYS_ADMIN'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try {
    user = getAuthUser(req);
  } catch (e) {
    console.error('session error:', e.message);
    return res.status(500).json({ error: '伺服器設定錯誤，請聯絡管理員' });
  }
  if (!user) return res.status(401).json({ error: '請先登入' });
  if (user.role !== 'SYS_ADMIN') return res.status(403).json({ error: '僅管理員可操作' });

  if (req.method === 'GET') {
    try {
      const users = await sb('users?select=id,name,role&order=name.asc');
      return res.status(200).json(users);
    } catch (e) {
      console.error('users-admin error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  // 新增成員
  if (req.method === 'POST') {
    const { name, passphrase, role } = req.body || {};
    const trimmedName = (name || '').trim();
    // NFC 正規化：與 api/auth.js 登入比對邏輯一致
    const trimmedPass = (passphrase || '').trim().normalize('NFC');
    const newRole = role || 'NORMAL';

    if (!trimmedName) return res.status(400).json({ error: '請輸入姓名' });
    if (trimmedName.length > 20) return res.status(400).json({ error: '姓名最多 20 字' });
    if (!trimmedPass) return res.status(400).json({ error: '請輸入密語' });
    if (trimmedPass.length < 4) return res.status(400).json({ error: '密語至少 4 個字' });
    if (trimmedPass.length > 50) return res.status(400).json({ error: '密語最多 50 字' });
    if (!VALID_ROLES.includes(newRole)) return res.status(400).json({ error: '無效的權限' });

    try {
      // 密語是登入唯一憑證，不可重複
      const dup = await sb(`users?passphrase=eq.${encodeURIComponent(trimmedPass)}&select=id`);
      if (dup && dup.length > 0) {
        return res.status(400).json({ error: '這個密語已被使用，請換一個' });
      }

      const passphrase_hash = await bcrypt.hash(trimmedPass, 10);
      const created = await sb('users', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          passphrase: trimmedPass,
          passphrase_hash,
          role: newRole
        })
      });
      const u = created[0];
      return res.status(201).json({ id: u.id, name: u.name, role: u.role });
    } catch (e) {
      console.error('users-admin POST error:', e);
      if (/duplicate|unique/i.test(e.message || '')) {
        return res.status(400).json({ error: '這個密語已被使用，請換一個' });
      }
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  // 變更權限
  if (req.method === 'PATCH') {
    const { id, role } = req.body || {};
    if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: '無效的成員 ID' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: '無效的權限' });
    // 防止把自己降級後鎖在後台外
    if (id === user.id) return res.status(400).json({ error: '不能修改自己的權限' });

    try {
      const updated = await sb(`users?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      if (!updated || updated.length === 0) return res.status(404).json({ error: '找不到成員' });
      const u = updated[0];
      return res.status(200).json({ id: u.id, name: u.name, role: u.role });
    } catch (e) {
      console.error('users-admin PATCH error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
