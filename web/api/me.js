import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ตรวจ session cookie (เซ็นด้วย HMAC) แล้วคืนตัวตน + โปรไฟล์ที่เคยลงทะเบียนไว้
// "ลงทะเบียนครั้งเดียว" — ดึงโปรไฟล์จาก Supabase ตาม LINE ID ทุกครั้งที่ล็อกอิน
export function verifySession(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)yh_session=([^;]+)/);
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig) return null;
  const secret = process.env.LINE_CHANNEL_SECRET || 'yala-heal-dev-secret';
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.uid || Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

export default async function handler(req, res) {
  const session = verifySession(req);
  if (!session) { res.status(200).json({ auth: null }); return; }

  let profile = null;
  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data } = await supabase.from('profiles').select('*').eq('line_user_id', session.uid).limit(1).maybeSingle();
    if (data) {
      profile = { name: data.name, phone: data.phone, zone: data.zone, nationalId: data.national_id, lineLinked: true };
    }
  } catch (err) {
    console.error('me profile load error:', err);
  }

  res.status(200).json({ auth: { uid: session.uid, name: session.name || '' }, profile });
}
