import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// บันทึกโปรไฟล์ผูกกับ LINE ID (ต้องล็อกอินก่อน) — "ลงทะเบียนครั้งเดียว"
// เก็บที่เซิร์ฟเวอร์ ครั้งหน้าล็อกอิน LINE ก็ดึงกลับมาได้ทุกเครื่อง
function verifySession(req) {
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
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  const session = verifySession(req);
  if (!session) { res.status(401).json({ ok: false, reason: 'not_logged_in' }); return; }

  try {
    const { name, phone, zone, nationalId } = req.body || {};
    if (!phone) { res.status(400).json({ ok: false, reason: 'missing_phone' }); return; }

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    await supabase.from('profiles').upsert({
      phone,
      name: name || session.name || null,
      zone: zone || null,
      national_id: nationalId || null,
      line_user_id: session.uid,
      line_linked: true,
      updated_at: new Date().toISOString(),
    });
    // ผูกเบอร์↔LINE ไว้ส่งแจ้งเตือน
    await supabase.from('line_links').upsert({ phone, line_user_id: session.uid, display_name: name || session.name || null });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('save-profile error:', err);
    res.status(500).json({ ok: false, reason: 'server_error' });
  }
}
