import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// สร้าง OTP 6 หลัก แล้วส่งเข้า LINE ของเบอร์ที่เชื่อมไว้
// ใช้วิธี stateless: เซ็นรหัสด้วย HMAC แล้วส่ง "token" กลับ (ไม่ส่งตัวรหัส) —
// ตัวรหัสจริงไปถึงผู้ใช้ทาง LINE เท่านั้น ฝั่ง verify ค่อยตรวจ token
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, reason: 'method_not_allowed' }); return; }
  try {
    const { phone } = req.body || {};
    if (!phone) { res.status(400).json({ ok: false, reason: 'missing_phone' }); return; }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // ใช้ได้ 5 นาที
    const secret = process.env.LINE_CHANNEL_SECRET || 'yala-heal-dev-secret';
    const sig = crypto.createHmac('sha256', secret).update(`${phone}.${otp}.${expiresAt}`).digest('hex');
    const token = `${expiresAt}.${sig}`;

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data } = await supabase.from('line_links').select('line_user_id').eq('phone', phone).maybeSingle();

    if (data?.line_user_id) {
      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
        body: JSON.stringify({ to: data.line_user_id, messages: [{ type: 'text', text: `🔐 รหัส OTP ของคุณคือ ${otp}\nใช้ยืนยันการแจ้งเหตุใน Yala Heal (มีอายุ 5 นาที)` }] }),
      });
      if (lineRes.ok) { res.status(200).json({ ok: true, sent: true, channel: 'line', token }); return; }
      console.error('otp-request LINE push error:', await lineRes.text());
    }

    // เบอร์นี้ยังไม่ได้เชื่อม LINE (หรือส่งไม่สำเร็จ) — ให้ฝั่งเว็บใช้โหมดสาธิตแทน
    res.status(200).json({ ok: true, sent: false, reason: 'not_linked', token });
  } catch (err) {
    console.error('otp-request error:', err);
    res.status(500).json({ ok: false, reason: 'server_error' });
  }
}
