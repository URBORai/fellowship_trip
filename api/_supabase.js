async function sb(path, options) {
  const opts = options || {};
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const method = opts.method || 'GET';
  const needReturn = ['POST', 'PATCH', 'PUT'].includes(method);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(needReturn ? { Prefer: 'return=representation' } : {}),
      ...(opts.headers || {})
    }
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = (body && (body.message || body.hint)) || `Supabase ${res.status}`;
    throw new Error(msg);
  }

  return body;
}

module.exports = { sb };
