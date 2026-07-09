const { sb } = require('../_supabase');
const { getAuthUser } = require('../_session');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS');
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
  const { id } = req.query;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
    return res.status(400).json({ error: '無效的 ID' });
  }

  // 編輯留言內容：僅 SYS_ADMIN
  if (req.method === 'PATCH') {
    if (role !== 'SYS_ADMIN') return res.status(403).json({ error: '僅管理員可編輯留言' });
    const { content } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ error: '請輸入內容' });
    if (content.trim().length > 500) return res.status(400).json({ error: '留言最多 500 字' });
    try {
      const rows = await sb(`board_posts?id=eq.${id}&select=id`);
      if (!rows || rows.length === 0) return res.status(404).json({ error: '找不到留言' });
      const updated = await sb(`board_posts?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: content.trim() })
      });
      return res.status(200).json(updated[0]);
    } catch (e) {
      console.error('board/[id] PATCH error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rows = await sb(`board_posts?id=eq.${id}&select=created_by`);
    if (!rows || rows.length === 0) return res.status(404).json({ error: '找不到留言' });
    if (role !== 'SYS_ADMIN' && rows[0].created_by !== userId) {
      return res.status(403).json({ error: '無權限刪除此留言' });
    }
    await sb(`board_posts?id=eq.${id}`, { method: 'DELETE' });
    return res.status(204).end();
  } catch (e) {
    console.error('board/[id] error:', e);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
};
