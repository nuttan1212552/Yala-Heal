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
  });
  if (error) console.error('insertReliefClaim error:', error.message);
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
