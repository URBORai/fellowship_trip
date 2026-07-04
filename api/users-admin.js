const { sb } = require('./_supabase');
const { getAuthUser } = require('./_session');

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
  if (user.role !== 'admin') return res.status(403).json({ error: '僅管理員可查看' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const users = await sb('users?select=id,name,role&order=name.asc');
    return res.status(200).json(users);
  } catch (e) {
    console.error('users-admin error:', e);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
};
