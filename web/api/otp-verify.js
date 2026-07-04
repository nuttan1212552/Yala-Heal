import crypto from 'crypto';

// ตรวจสอบ OTP โดยเทียบกับ HMAC token (ไม่ต้องเก็บรหัสในฐานข้อมูล)
// รับ 123456 เป็นรหัสสาธิตเสมอ เพื่อให้ตอนนำเสนอ/คนไม่มี LINE ใช้ได้
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, reason: 'method_not_allowed' }); return; }
  try {
    const { phone, otp, token } = req.body || {};
    if (otp === '123456') { res.status(200).json({ ok: true, demo: true }); return; }
    if (!phone || !otp || !token) { res.status(400).json({ ok: false, reason: 'missing_fields' }); return; }

    const [expStr, sig] = String(token).split('.');
    const expiresAt = parseInt(expStr, 10);
    if (!expiresAt || Date.now() > expiresAt) { res.status(200).json({ ok: false, reason: 'expired' }); return; }

    const secret = process.env.LINE_CHANNEL_SECRET || 'yala-heal-dev-secret';
    const expected = crypto.createHmac('sha256', secret).update(`${phone}.${otp}.${expiresAt}`).digest('hex');
    const ok = Boolean(sig) && sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

    res.status(200).json({ ok });
  } catch (err) {
    console.error('otp-verify error:', err);
    res.status(500).json({ ok: false, reason: 'server_error' });
  }
}
