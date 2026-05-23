const { sb } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, x-user-role');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: '未登入' });

  if (req.method === 'GET') {
    try {
      const posts = await sb('board_posts?select=*,users(name)&order=created_at.desc');
      return res.status(200).json(posts);
    } catch (e) {
      console.error('board GET error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  if (req.method === 'POST') {
    const { content } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '請輸入內容' });
    }
    try {
      const post = await sb('board_posts', {
        method: 'POST',
        body: JSON.stringify({ created_by: userId, content: content.trim() })
      });
      return res.status(201).json(post[0]);
    } catch (e) {
      console.error('board POST error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
