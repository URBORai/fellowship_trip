const { sb } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 只回傳 id 與姓名，供財務頁結算使用，開放瀏覽不需登入
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const users = await sb('users?select=id,name&order=name.asc');
    return res.status(200).json(users);
  } catch (e) {
    console.error('users error:', e);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
};
