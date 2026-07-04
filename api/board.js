const { sb } = require('./_supabase');
const { getAuthUser } = require('./_session');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let user;
  try {
    user = getAuthUser(req);
  } catch (e) {
    console.error('session error:', e.message);
    return res.status(500).json({ error: '伺服器設定錯誤，請聯絡管理員' });
  }

  // 留言板公開可讀（見使用者操作流程），發文才需要登入
  if (req.method === 'GET') {
    try {
      const posts = await sb('board_posts?select=*,users(name)&order=created_at.desc');
      return res.status(200).json(posts);
    } catch (e) {
      console.error('board GET error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  // 發文開放訪客：登入者記 created_by，訪客必須自填暱稱記在 guest_name
  if (req.method === 'POST') {
    const { content, guest_name } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '請輸入內容' });
    }
    if (content.trim().length > 500) {
      return res.status(400).json({ error: '留言最多 500 字' });
    }

    const row = { content: content.trim() };
    if (user) {
      row.created_by = user.id;
    } else {
      const name = (guest_name || '').trim();
      if (!name) return res.status(400).json({ error: '請輸入暱稱' });
      if (name.length > 20) return res.status(400).json({ error: '暱稱最多 20 字' });
      row.guest_name = name;
    }

    try {
      const post = await sb('board_posts', {
        method: 'POST',
        body: JSON.stringify(row)
      });
      return res.status(201).json(post[0]);
    } catch (e) {
      console.error('board POST error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
