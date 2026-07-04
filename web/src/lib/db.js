import { supabase, hasSupabase } from './supabase';

// ============================================================
// ข้อมูลจำลอง (mock) — ใช้เมื่อยังไม่ได้เชื่อม Supabase
// เพื่อให้เว็บยังเล่นได้ปกติในโหมดพรีวิว
// ============================================================

export const MOCK_DONATIONS = [
  { id: 1, type: 'need', name: 'น้ำดื่มสะอาด', qty: 'ต้องการ 12 แพ็ค', zone: 'ชุมชนบ้านร่ม', note: 'มีเด็กเล็กและผู้สูงอายุ' },
  { id: 2, type: 'give', name: 'ข้าวสาร 5 กก.', qty: 'แบ่งปันได้ 8 ถุง', zone: 'ครัวกลางชุมชน', note: 'รับที่จุดแจกจ่าย' },
  { id: 3, type: 'need', name: 'ยาสามัญ/เวชภัณฑ์', qty: 'ต้องการด่วน', zone: 'ตลาดเก่า', note: 'ยาแก้ไข้ ผ้าพันแผล' },
  { id: 4, type: 'gig', name: 'อาสาช่วยขนของ', qty: 'ต้องการ 3 คน', zone: 'ท่าเรือ', note: 'ช่วงบ่ายวันนี้' },
  { id: 5, type: 'give', name: 'ผ้าห่ม/เสื้อผ้า', qty: 'แบ่งปันได้ 20 ชุด', zone: 'วัดกลาง', note: 'สภาพดี ซักสะอาด' },
];

export const MOCK_DASH_CASES = [
  { id: 'YH-284913', title: 'ขอความช่วยเหลือ · ติดค้างบนหลังคา', zone: 'ต.สะเตง', status: 'รอดำเนินการ' },
  { id: 'YH-284902', title: 'ผู้ป่วยติดเตียงต้องอพยพ', zone: 'ต.บุดี', status: 'กำลังดำเนินการ' },
  { id: 'YH-284888', title: 'ขอเรือรับส่ง 4 คน', zone: 'ต.ยุโป', status: 'กำลังดำเนินการ' },
  { id: 'YH-284790', title: 'อพยพครอบครัว 5 คน สำเร็จ', zone: 'ต.สะเตง', status: 'เสร็จสิ้น' },
  { id: 'YH-284712', title: 'ขอถุงยังชีพ 20 ครัวเรือน', zone: 'ต.ท่าสาป', status: 'รอดำเนินการ' },
  { id: 'YH-284655', title: 'น้ำท่วมขังถนนเข้าหมู่บ้าน', zone: 'ต.สะเตงนอก', status: 'กำลังดำเนินการ' },
  { id: 'YH-284590', title: 'ผู้สูงอายุอยู่ลำพัง ต้องการดูแล', zone: 'ต.บุดี', status: 'กำลังดำเนินการ' },
  { id: 'YH-284511', title: 'อพยพผู้ป่วยไปศูนย์พักพิง สำเร็จ', zone: 'ต.ยุโป', status: 'เสร็จสิ้น' },
  { id: 'YH-284488', title: 'ขอเครื่องสูบน้ำ', zone: 'ต.สะเตง', status: 'เสร็จสิ้น' },
  { id: 'YH-284402', title: 'ซ่อมไฟฟ้าชุมชน สำเร็จ', zone: 'ต.ท่าสาป', status: 'เสร็จสิ้น' },
];

// ============================================================
// ชั้นเข้าถึงข้อมูล — ใช้ Supabase ถ้ามี ไม่งั้นใช้ mock
// ทุกฟังก์ชันไม่ throw: ถ้า error จะ log แล้ว fallback ให้แอปทำงานต่อได้
// ============================================================

export async function fetchDonations() {
  if (!hasSupabase) return MOCK_DONATIONS;
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchDonations error:', error.message);
    return MOCK_DONATIONS;
  }
  return data;
}

export async function insertDonation(item) {
  if (!hasSupabase) return { ...item, id: Date.now() };
  const { data, error } = await supabase
    .from('donations')
    .insert({ type: item.type, name: item.name, qty: item.qty, zone: item.zone, note: item.note })
    .select()
    .single();
  if (error) {
    console.error('insertDonation error:', error.message);
    return { ...item, id: Date.now() };
  }
  return data;
}

export async function insertSosReport(report) {
  if (!hasSupabase) return;
  const { error } = await supabase.from('sos_reports').insert({
    ticket: report.ticket,
    phone: report.phone,
    incident_type: report.type,
    people: report.people,
    vuln: report.vuln,
    note: report.note,
    zone: report.zone || 'ต.สะเตง',
  });
  if (error) console.error('insertSosReport error:', error.message);
}

export async function fetchSosCases() {
  if (!hasSupabase) return MOCK_DASH_CASES;
  const { data, error } = await supabase
    .from('sos_reports')
    .select('ticket, incident_type, zone, status')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) {
    console.error('fetchSosCases error:', error.message);
    return MOCK_DASH_CASES;
  }
  if (!data.length) return MOCK_DASH_CASES;
  return data.map((r) => ({ id: r.ticket, title: r.incident_type || 'แจ้งเหตุฉุกเฉิน', zone: r.zone, status: r.status || 'รอดำเนินการ' }));
}

export async function insertReliefClaim(claim) {
  if (!hasSupabase) return;
  const { error } = await supabase.from('relief_claims').insert({
    ref: claim.ref,
    name: claim.name,
    grade: claim.grade,
    water_level: claim.water,
    mode: claim.mode,
    national_id: claim.nationalId || null,
    id_method: claim.idMethod || null,
  });
  if (error) console.error('insertReliefClaim error:', error.message);
}

// คำขอในศูนย์แบ่งปัน (ขอรับ / สมัครอาสา / แจ้งมีให้) — บันทึกจริง
export async function insertShareRequest(reqData) {
  if (!hasSupabase) return;
  const { error } = await supabase.from('share_requests').insert({
    item_name: reqData.itemName || null,
    type: reqData.type || null,
    name: reqData.name,
    phone: reqData.phone,
    qty: reqData.qty || null,
    note: reqData.note || null,
  });
  if (error) console.error('insertShareRequest error:', error.message);
}

export async function insertMindRequest(req) {
  if (!hasSupabase) return;
  const { error } = await supabase.from('mind_requests').insert({
    ref: req.ref,
    phone: req.phone,
    urgent: req.urgent,
    position: req.position,
  });
  if (error) console.error('insertMindRequest error:', error.message);
}

// ============================================================
// Dashboard — สถิติรวมจากเคส SOS จริง (คำนวณสด ไม่ hardcode)
// ============================================================

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const FALLBACK_STATS = {
  total: 128, pending: 14, inProgress: 37, done: 91,
  week: [44, 66, 52, 92, 74, 58, 46].map((h, i) => ({ label: THAI_DAYS[(i + 1) % 7], height: h })),
};

export async function fetchDashboardStats() {
  if (!hasSupabase) return FALLBACK_STATS;
  const { data, error } = await supabase.from('sos_reports').select('status, created_at');
  if (error || !data || !data.length) return FALLBACK_STATS;

  const total = data.length;
  const pending = data.filter((r) => r.status === 'รอดำเนินการ').length;
  const inProgress = data.filter((r) => r.status === 'กำลังดำเนินการ').length;
  const done = data.filter((r) => r.status === 'เสร็จสิ้น').length;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const counts = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return data.filter((r) => (r.created_at || '').slice(0, 10) === key).length;
  });
  const max = Math.max(1, ...counts);
  const week = days.map((d, i) => ({
    label: THAI_DAYS[d.getDay()],
    height: Math.round(10 + (counts[i] / max) * 90),
  }));

  return { total, pending, inProgress, done, week };
}

// ============================================================
// ศูนย์แบ่งปัน · จ้างงาน/รับงาน — เก็บลง Supabase จริง
// ============================================================

export async function fetchJobs() {
  if (!hasSupabase) return null;
  const { data: jobs, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
  if (error || !jobs || !jobs.length) return null;
  const { data: apps } = await supabase.from('job_applications').select('job_id');
  const counts = {};
  (apps || []).forEach((a) => { counts[a.job_id] = (counts[a.job_id] || 0) + 1; });
  return jobs.map((j) => ({
    id: j.id,
    title: j.title,
    pay: j.pay,
    zone: j.zone,
    note: j.note,
    need: j.need,
    applied: Math.min(j.need, (j.applied_base || 0) + (counts[j.id] || 0)),
    poster: j.poster,
    posterPhone: j.poster_phone,
    rating: j.poster_rating,
    jobs: j.poster_jobs,
    verified: j.verified,
    urgent: j.urgent,
  }));
}

// ลงประกาศงานใหม่ — คืนงานที่บันทึกแล้ว (map แบบเดียวกับ fetchJobs) หรือ null ถ้าไม่มี Supabase
export async function insertJob(job) {
  if (!hasSupabase) return null;
  const { data, error } = await supabase.from('jobs').insert({
    title: job.title,
    pay: job.pay,
    zone: job.zone,
    note: job.note,
    need: job.need,
    applied_base: 0,
    poster: job.poster,
    poster_phone: job.posterPhone,
    poster_rating: 5.0,
    poster_jobs: 0,
    verified: true,
    urgent: job.urgent,
  }).select().single();
  if (error) {
    console.error('insertJob error:', error.message);
    return null;
  }
  return {
    id: data.id,
    title: data.title,
    pay: data.pay,
    zone: data.zone,
    note: data.note,
    need: data.need,
    applied: 0,
    poster: data.poster,
    posterPhone: data.poster_phone,
    rating: data.poster_rating,
    jobs: data.poster_jobs,
    verified: data.verified,
    urgent: data.urgent,
  };
}

export async function insertJobApplication(jobId, phone, identity = {}) {
  if (!hasSupabase || typeof jobId !== 'number') return;
  const { error } = await supabase.from('job_applications').insert({
    job_id: jobId,
    phone,
    full_name: identity.fullName || null,
    national_id: identity.nationalId || null,
    id_method: identity.idMethod || null,
  });
  if (error) console.error('insertJobApplication error:', error.message);
}

export async function insertJobReport(jobId, reason) {
  if (!hasSupabase || typeof jobId !== 'number') return;
  const { error } = await supabase.from('job_reports').insert({ job_id: jobId, reason });
  if (error) console.error('insertJobReport error:', error.message);
}

export async function insertJobRating(jobId, stars, tags) {
  if (!hasSupabase) return;
  const { error } = await supabase.from('job_ratings').insert({ job_id: typeof jobId === 'number' ? jobId : null, stars, tags });
  if (error) console.error('insertJobRating error:', error.message);
}

// ============================================================
// LINE — เชื่อมบัญชี LINE เข้ากับเบอร์โทร + ส่งแจ้งเตือน
// ============================================================

const LINE_LOGIN_CHANNEL_ID = '2010600622';
const LINE_REDIRECT_URI = 'https://yala-heal.vercel.app/api/line-callback';

// สร้างลิงก์ไปหน้ายินยอมของ LINE — ใช้เบอร์โทรเป็น state เพื่อผูกกลับตอน callback
export function lineLoginUrl(phone) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: LINE_REDIRECT_URI,
    state: (phone || '').trim(),
    scope: 'profile openid',
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

// ยิงแจ้งเตือนแบบ fire-and-forget — ไม่เชื่อม LINE ไว้ก็แค่เงียบๆ ไม่กระทบ flow หลัก
export function notifyLine(phone, message) {
  if (!phone || !message) return;
  fetch('/api/line-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  }).catch(() => {});
}

// ขอ OTP — ส่งเข้า LINE ถ้าเบอร์นี้เชื่อมไว้ ไม่งั้นตกไปโหมดสาธิต (123456)
export async function requestOtp(phone) {
  try {
    const r = await fetch('/api/otp-request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }),
    });
    return await r.json();
  } catch {
    return { ok: true, sent: false, reason: 'network', token: '' }; // ออฟไลน์/พรีวิว → ใช้ 123456 ได้
  }
}

// ยืนยัน OTP — ตรวจกับ backend, ถ้าติดต่อ backend ไม่ได้ก็ยอมรับ 123456 (สาธิต)
export async function verifyOtp(phone, otp, token) {
  try {
    const r = await fetch('/api/otp-verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp, token }),
    });
    const data = await r.json();
    return Boolean(data.ok);
  } catch {
    return otp === '123456';
  }
}
