// ออกจากระบบ — ล้าง session cookie
export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'yh_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  res.status(200).json({ ok: true });
}
