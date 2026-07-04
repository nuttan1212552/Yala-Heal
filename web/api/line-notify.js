import { createClient } from '@supabase/supabase-js';

// ยิงข้อความเข้า LINE ของเจ้าของเบอร์โทรที่ระบุ (ถ้าเคยเชื่อมบัญชีไว้แล้ว)
// เรียกแบบ fire-and-forget จากฝั่งเว็บ — ไม่เชื่อม LINE ไว้ก็แค่ข้ามเงียบๆ ไม่มีผลกับ flow หลัก
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'method_not_allowed' });
    return;
  }

  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) {
      res.status(400).json({ ok: false, reason: 'missing_fields' });
      return;
    }

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data } = await supabase
      .from('line_links')
      .select('line_user_id')
      .eq('phone', phone)
      .maybeSingle();

    if (!data?.line_user_id) {
      res.status(200).json({ ok: false, reason: 'not_connected' });
      return;
    }

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to: data.line_user_id, messages: [{ type: 'text', text: message }] }),
    });

    if (!lineRes.ok) {
      console.error('LINE push error:', await lineRes.text());
      res.status(200).json({ ok: false, reason: 'line_api_error' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('line-notify error:', err);
    res.status(500).json({ ok: false, reason: 'server_error' });
  }
}
