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

  if (req.method === 'GET') {
    // 財務明細開放瀏覽，不需登入；新增／修改／刪除仍需登入
    try {
      const data = await sb('expenses?select=*,users(name)&order=created_at.desc');
      return res.status(200).json(data);
    } catch (e) {
      console.error('expenses GET error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  if (req.method === 'POST') {
    if (!user) return res.status(401).json({ error: '請先登入' });
    const userId = user.id;
    const { description, amount, date } = req.body || {};
    if (!description || !amount || !date) {
      return res.status(400).json({ error: '請填寫所有欄位' });
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: '金額必須大於 0' });
    }
    try {
      const created = await sb('expenses', {
        method: 'POST',
        body: JSON.stringify({
          created_by: userId,
          description: description.trim(),
          amount: amt,
          date
        })
      });
      return res.status(201).json(created[0]);
    } catch (e) {
      console.error('expenses POST error:', e);
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
