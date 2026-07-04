const bcrypt = require('bcryptjs');
const { sb } = require('./_supabase');
const { issueToken } = require('./_session');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { passphrase } = req.body || {};
  if (!passphrase || !passphrase.trim()) {
    return res.status(400).json({ error: '請輸入密語' });
  }

  try {
    const candidates = await sb('users?select=id,name,role,passphrase_hash');
    let matched = null;
    for (const u of candidates || []) {
      if (!u.passphrase_hash) continue;
      const ok = await bcrypt.compare(passphrase.trim(), u.passphrase_hash);
      if (ok) {
        matched = u;
        break;
      }
    }
    if (!matched) {
      return res.status(401).json({ error: '密語錯誤，請再試一次' });
    }
    const token = issueToken({ id: matched.id, role: matched.role });
    return res.status(200).json({ token, id: matched.id, name: matched.name, role: matched.role });
  } catch (e) {
    console.error('auth error:', e);
    return res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
};
