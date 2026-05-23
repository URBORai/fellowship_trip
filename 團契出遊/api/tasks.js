const { sb } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, x-user-role');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  if (!userId) return res.status(401).json({ error: '未登入' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let query = 'tasks?select=*,users(name)&order=user_id.asc,status.asc,created_at.asc';
    if (role !== 'admin') query += `&user_id=eq.${userId}`;
    const tasks = await sb(query);
    return res.status(200).json(tasks);
  } catch (e) {
    console.error('tasks error:', e);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
};
