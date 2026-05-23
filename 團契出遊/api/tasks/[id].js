const { sb } = require('../_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, x-user-role');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  const { id } = req.query;

  if (!userId) return res.status(401).json({ error: '未登入' });
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rows = await sb(`tasks?id=eq.${id}&select=user_id`);
    if (!rows || rows.length === 0) return res.status(404).json({ error: '找不到任務' });
    if (role !== 'admin' && rows[0].user_id !== userId) {
      return res.status(403).json({ error: '無權限修改此任務' });
    }

    const { status } = req.body || {};
    if (!status || !['pending', 'done'].includes(status)) {
      return res.status(400).json({ error: '無效的狀態值' });
    }

    const updated = await sb(`tasks?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.status(200).json(updated[0]);
  } catch (e) {
    console.error('tasks/[id] error:', e);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
};
