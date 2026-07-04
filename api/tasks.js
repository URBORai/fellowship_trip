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
  const userId = user.id;
  const role = user.role;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let query = 'tasks?select=*,users(name)&order=user_id.asc,status.asc,created_at.asc';
    if (role !== 'SYS_ADMIN') query += `&user_id=eq.${userId}`;
    const tasks = await sb(query);
    return res.status(200).json(tasks);
  } catch (e) {
    console.error('tasks error:', e);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
};
