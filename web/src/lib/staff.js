// ============================================================
// ระบบเข้าถึงหลังบ้านสำหรับเจ้าหน้าที่ (Role-based Access ด้วย passcode)
// เดโม-เกรด: ตรวจ passcode ฝั่งหน้าเว็บ แล้วจำ role ไว้ใน localStorage
// จริงจังกว่านี้ค่อยเปลี่ยนไปใช้ Supabase Auth + ตาราง staff_roles ได้
// ============================================================

// 3 ระดับสิทธิ์ตามสถาปัตยกรรมในเอกสาร:
//  - pdd       = เจ้าหน้าที่ ปภ. (Command Center — แผนที่วิกฤต + อนุมัติวงเงินฉุกเฉิน)
//  - municipal = เจ้าหน้าที่เทศบาล (สวัสดิการ + กองช่าง — อนุมัติเยียวยา/กายอุปกรณ์)
//  - caregiver = อสม./ประธานชุมชน (ยื่นเรื่องแทนประชาชน + ดูแลกลุ่มเปราะบาง)
export const STAFF_ROLES = {
  pdd: {
    key: 'pdd',
    label: 'ศูนย์บัญชาการ ปภ.',
    short: 'ปภ.',
    passcode: 'pdd-9111',
    color: '#C0362E',
    desc: 'แผนที่วิกฤต Real-time · หมุดบ้านกลุ่มเปราะบาง · อนุมัติวงเงินเยียวยาฉุกเฉิน',
    // เห็นข้อมูล: เยียวยา + บ้านทั้งหมด (พิกัด/เปราะบาง) — ไม่เห็นข้อมูลสุขภาพรายบุคคล
    can: ['map', 'relief', 'emergency'],
  },
  municipal: {
    key: 'municipal',
    label: 'เจ้าหน้าที่เทศบาล',
    short: 'เทศบาล',
    passcode: 'mun-9222',
    color: '#0E8390',
    desc: 'ฝ่ายสวัสดิการ + กองช่าง · ตรวจสอบ/อนุมัติเยียวยา · อนุมัติกายอุปกรณ์',
    can: ['relief', 'welfare'],
  },
  caregiver: {
    key: 'caregiver',
    label: 'อสม. / ผู้ดูแลชุมชน',
    short: 'อสม.',
    passcode: 'osm-9333',
    color: '#B36B00',
    desc: 'ยื่นเรื่องรักษาสิทธิ์/แจ้งเหตุแทนประชาชนที่ไม่มีสมาร์ทโฟน · ดูแลกลุ่มเปราะบาง',
    can: ['welfare', 'vulnerable'],
  },
};

const KEY = 'yh_staff_role';

export function readStaffRole() {
  try {
    const k = localStorage.getItem(KEY);
    return k && STAFF_ROLES[k] ? STAFF_ROLES[k] : null;
  } catch { return null; }
}

// ตรวจ passcode → คืน role ถ้าถูก ไม่งั้นคืน null
export function loginStaff(passcode) {
  const code = (passcode || '').trim().toLowerCase();
  const match = Object.values(STAFF_ROLES).find((r) => r.passcode === code);
  if (!match) return null;
  try { localStorage.setItem(KEY, match.key); } catch { /* noop */ }
  return match;
}

export function logoutStaff() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function roleCan(role, cap) {
  return Boolean(role && role.can.includes(cap));
}
