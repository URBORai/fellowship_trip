const crypto = require('crypto');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      '缺少 SESSION_SECRET 環境變數。請至 Vercel 專案設定 (Settings → Environment Variables) ' +
      '新增 SESSION_SECRET（建議用 `openssl rand -base64 32` 產生一組至少 32 bytes 的隨機字串）。'
    );
  }
  return secret;
}

function sign(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function issueToken({ id, role }) {
  const secret = getSecret();
  const payload = JSON.stringify({ id, role, exp: Date.now() + SEVEN_DAYS_MS });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

function getAuthUser(req) {
  const secret = getSecret();
  const authHeader = (req.headers && req.headers['authorization']) || '';
  const match = /^Bearer (.+)$/.exec(authHeader);
  if (!match) return null;

  const token = match[1];
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  const expectedSig = sign(payloadB64, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  if (!payload.id || !payload.role) return null;

  return { id: payload.id, role: payload.role };
}

module.exports = { issueToken, getAuthUser };
