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

  if (req.method === 'GET') {
    try {
      let query = 'tasks?select=*,users(name)&order=user_id.asc,status.asc,created_at.asc';
      if (role !== 'SYS_ADMIN') query += `&user_id=eq.${userId}`;
      const tasks = await sb(query);
      return res.status(200).json(tasks);
    } catch (e) {
      console.error('tasks error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  // 指派任務：僅 SYS_ADMIN，且只能指派給 NORMAL 成員（管理員不參加任務）
  if (req.method === 'POST') {
    if (role !== 'SYS_ADMIN') return res.status(403).json({ error: '僅管理員可指派任務' });
    const { user_id, title, content } = req.body || {};
    if (!user_id || !title || !title.trim()) {
      return res.status(400).json({ error: '請選擇成員並填寫任務標題' });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
      return res.status(400).json({ error: '無效的成員 ID' });
    }
    try {
      const targets = await sb(`users?id=eq.${user_id}&select=id,role`);
      if (!targets || targets.length === 0) return res.status(404).json({ error: '找不到成員' });
      if (targets[0].role !== 'NORMAL') return res.status(400).json({ error: '只能指派給一般成員' });

      const created = await sb('tasks', {
        method: 'POST',
        body: JSON.stringify({
          user_id,
          title: title.trim(),
          content: (content || '').trim() || null,
          status: 'pending'
        })
      });
      return res.status(201).json(created[0]);
    } catch (e) {
      console.error('tasks POST error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
