import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SESSION_DAYS = 365;

// เซ็น session ด้วย HMAC (เบราว์เซอร์แก้ไม่ได้) แล้วเก็บใน HttpOnly cookie
function makeSessionCookie(uid, name) {
  const secret = process.env.LINE_CHANNEL_SECRET || 'yala-heal-dev-secret';
  const payload = { uid, name, exp: Date.now() + SESSION_DAYS * 86400000 };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const token = `${body}.${sig}`;
  return `yh_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`;
}

// LINE Login เด้งกลับมาที่นี่หลังผู้ใช้กด "ยินยอม"
// - state เป็นเบอร์ (0xxxxxxxxx) => ผูกเบอร์↔LINE ไว้ส่งแจ้งเตือน
// - state เป็นอย่างอื่น (เช่น 'login') => เข้าสู่ระบบอย่างเดียว
// ทุกกรณี: ออก session cookie ที่เซ็นชื่อไว้ให้
export default async function handler(req, res) {
  const { code, state } = req.query;
  const raw = (state || '').trim();
  const phone = /^0\d{9}$/.test(raw) ? raw : '';

  if (!code) { res.redirect(302, '/?line=error'); return; }

  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://yala-heal.vercel.app/api/line-callback',
        client_id: process.env.LINE_LOGIN_CHANNEL_ID,
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('line-callback token error:', tokenData);
      res.redirect(302, '/?line=error');
      return;
    }

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.userId) { res.redirect(302, '/?line=error'); return; }

    // ผูกเบอร์↔LINE (ถ้ามีเบอร์มากับ state) เพื่อให้ส่งแจ้งเตือนได้
    if (phone) {
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
      await supabase.from('line_links').upsert({
        phone,
        line_user_id: profile.userId,
        display_name: profile.displayName || null,
      });
    }

    res.setHeader('Set-Cookie', makeSessionCookie(profile.userId, profile.displayName || ''));
    res.redirect(302, phone ? '/?line=connected' : '/?login=ok');
  } catch (err) {
    console.error('line-callback error:', err);
    res.redirect(302, '/?line=error');
  }
}
