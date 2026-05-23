const { sb } = require('./_supabase');

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
    const users = await sb(
      `users?passphrase=eq.${encodeURIComponent(passphrase.trim())}&select=id,name,role`
    );
    if (!users || users.length === 0) {
      return res.status(401).json({ error: '密語錯誤，請再試一次' });
    }
    return res.status(200).json(users[0]);
  } catch (e) {
    console.error('auth error:', e);
    return res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
};
