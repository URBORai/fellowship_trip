const { sb } = require('./_supabase');
const { getAuthUser } = require('./_session');

const VALID_KEYS = ['home', 'schedule'];
const MAX_CONTENT_BYTES = 100 * 1024; // 100KB 上限，避免異常大的內容

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 首頁與行程頁公開可讀，讀取不需登入
  if (req.method === 'GET') {
    const key = (req.query && req.query.key) || '';
    if (!VALID_KEYS.includes(key)) {
      return res.status(400).json({ error: '無效的 key' });
    }
    try {
      const rows = await sb(`site_content?key=eq.${key}&select=content,updated_at`);
      if (!rows || rows.length === 0) return res.status(200).json({ content: null });
      return res.status(200).json(rows[0]);
    } catch (e) {
      console.error('site-content GET error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  // 更新內容：僅 SYS_ADMIN
  if (req.method === 'PUT') {
    let user;
    try {
      user = getAuthUser(req);
    } catch (e) {
      console.error('session error:', e.message);
      return res.status(500).json({ error: '伺服器設定錯誤，請聯絡管理員' });
    }
    if (!user) return res.status(401).json({ error: '請先登入' });
    if (user.role !== 'SYS_ADMIN') return res.status(403).json({ error: '僅管理員可修改內容' });

    const { key, content } = req.body || {};
    if (!VALID_KEYS.includes(key)) {
      return res.status(400).json({ error: '無效的 key' });
    }
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ error: '內容格式錯誤' });
    }
    if (Buffer.byteLength(JSON.stringify(content), 'utf8') > MAX_CONTENT_BYTES) {
      return res.status(400).json({ error: '內容過大' });
    }

    try {
      const rows = await sb('site_content?on_conflict=key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ key, content, updated_at: new Date().toISOString() })
      });
      return res.status(200).json(rows[0]);
    } catch (e) {
      console.error('site-content PUT error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
