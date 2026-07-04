import { createClient } from '@supabase/supabase-js';

// LINE Login เด้งกลับมาที่นี่หลังผู้ใช้กด "ยินยอม" — แลก code เป็น token,
// ดึงโปรไฟล์ LINE แล้วบันทึกคู่ (เบอร์โทร ↔ LINE User ID) ลง Supabase
export default async function handler(req, res) {
  const { code, state } = req.query;
  const phone = (state || '').trim();

  if (!code) {
    res.redirect(302, '/share?line=error');
    return;
  }

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
      res.redirect(302, '/share?line=error');
      return;
    }

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (phone && profile.userId) {
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
      await supabase.from('line_links').upsert({
        phone,
        line_user_id: profile.userId,
        display_name: profile.displayName || null,
      });
    }

    res.redirect(302, '/share?line=connected');
  } catch (err) {
    console.error('line-callback error:', err);
    res.redirect(302, '/share?line=error');
  }
}
