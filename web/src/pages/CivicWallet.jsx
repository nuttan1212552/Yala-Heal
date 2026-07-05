import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ReliefIcon, MindIcon, ShareIcon } from '../components/Icons';

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(18px,3vw,24px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const sectionTitle = { fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '26px 0 12px', letterSpacing: .3 };

// ---- ข้อมูลสาธิต (mock) — เชื่อม API กองการประปา/กองคลัง/ทะเบียนราษฎร์จริงในเฟสถัดไป ----
const BILLS = [
  { key: 'water', label: 'ค่าน้ำประปา', amount: '312 บาท', due: 'ครบกำหนด 20 ก.ค. 2569', color: '#0E8A5F', action: 'ชำระ / คัดลอก QR' },
  { key: 'trash', label: 'ค่าธรรมเนียมขยะ', amount: '40 บาท', due: 'ครบกำหนด 25 ก.ค. 2569', color: '#B36B00', action: 'ชำระ / คัดลอก QR' },
  { key: 'landtax', label: 'ภาษีที่ดินและสิ่งปลูกสร้าง', amount: 'รอประเมิน', due: 'รอบถัดไป ม.ค. 2570', color: '#5B54C9', action: 'ดูรายละเอียด' },
  { key: 'signtax', label: 'ภาษีป้าย (ร้านค้า)', amount: 'ไม่มีป้ายจดทะเบียน', due: 'ถ่ายรูปป้ายเพื่อประเมิน', color: '#8592A3', action: 'แจ้งป้ายร้าน' },
];

const ONDEMAND = [
  { key: 'septic', icon: '🚽', label: 'เรียกรถสูบสิ่งปฏิกูล', sub: 'สูบส้วม · ปักหมุดให้รถเทศบาลไปถูกบ้าน' },
  { key: 'tree', icon: '🌳', label: 'ตัดต้นไม้ใหญ่', sub: 'ถ่ายรูปต้นไม้ ปักหมุด เทศบาลจัดคิวรถ' },
  { key: 'bulky', icon: '🛋️', label: 'เก็บขยะชิ้นใหญ่', sub: 'ที่นอนเก่า/เฟอร์นิเจอร์ · นัดวันเก็บ' },
];

const HEALTH = [
  { key: 'rabies', icon: '🐶', label: 'วัคซีนพิษสุนัขบ้า', sub: 'ขึ้นทะเบียนสัตว์เลี้ยง · จองฉีดฟรีประจำปี' },
  { key: 'newborn', icon: '👶', label: 'เงินอุดหนุนเด็กแรกเกิด', sub: 'เช็คสถานะเงินเข้า 600 บาท/เดือน' },
];

const WELFARE = [
  { key: 'elder', icon: '👴', label: 'เบี้ยยังชีพผู้สูงอายุ', sub: 'ลงทะเบียน/ตรวจสอบสิทธิ์รายเดือน' },
  { key: 'disable', icon: '♿', label: 'เบี้ยความพิการ', sub: 'ตรวจสอบสิทธิ์ · เตือนต่ออายุบัตร' },
  { key: 'scholar', icon: '🎓', label: 'ทุนการศึกษาท้องถิ่น', sub: 'ยื่นขอทุนเรียนสำหรับบุตรหลาน' },
];

// Welfare Tracker — สำหรับบ้านกลุ่มเปราะบาง (ติดตามกายอุปกรณ์)
const TRACKER = [
  { key: 'bed', icon: '🛏️', label: 'ยืมเตียงผู้ป่วย', status: 'อยู่ระหว่างจัดส่งโดย อสม.', c: '#B36B00' },
  { key: 'diaper', icon: '🧷', label: 'ขอผ้าอ้อมผู้ใหญ่', status: 'อนุมัติแล้ว · รอบเดือน ก.ค.', c: '#0E8A5F' },
  { key: 'card', icon: '🪪', label: 'บัตรผู้พิการ', status: 'เหลืออายุ 45 วัน — เตรียมต่ออายุ', c: '#C0362E' },
];

function Bill({ b, onPay }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>{b.label}</div>
        <div style={{ fontSize: 12.5, color: '#52607A' }}>{b.due}</div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div style={{ fontWeight: 700, color: b.color, fontSize: 14.5, whiteSpace: 'nowrap' }}>{b.amount}</div>
        <button onClick={onPay} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '2px 0' }}>{b.action} →</button>
      </div>
    </div>
  );
}

function ServiceCard({ item, onClick }) {
  return (
    <button onClick={onClick} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16 }}>
      <span aria-hidden="true" style={{ fontSize: 24, flex: 'none' }}>{item.icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>{item.label}</div>
        <div style={{ fontSize: 12.5, color: '#52607A', lineHeight: 1.5 }}>{item.sub}</div>
      </div>
    </button>
  );
}

export default function CivicWallet() {
  const navigate = useNavigate();
  const { household, showToast } = useApp();
  const demo = () => showToast('บริการตัวอย่าง — จะเชื่อมระบบจริงของเทศบาลในเฟสถัดไป');

  if (!household?.onboardedAt) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px', textAlign: 'center' }}>
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏡</div>
          <h2 style={{ fontSize: 21, marginBottom: 8 }}>ยังไม่ได้ลงทะเบียนบ้านดิจิทัล</h2>
          <p style={{ color: '#52607A', marginBottom: 18 }}>ลงทะเบียนครั้งเดียวเพื่อเปิดใช้กระเป๋าเมืองดิจิทัล</p>
          <button onClick={() => navigate('/onboarding')} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>เริ่มลงทะเบียน</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(24px,4vw,40px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏡</span>
        <div>
          <h1 style={{ fontSize: 'clamp(22px,3.4vw,29px)' }}>กระเป๋าเมือง & สิทธิ์ของฉัน</h1>
          <div style={{ fontSize: 13, color: '#52607A' }}>{household.name || 'ครัวเรือนของคุณ'} · {household.address || 'บ้านของคุณ'}</div>
        </div>
      </div>

      {household.vulnerable && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 12, padding: '13px 15px', margin: '14px 0 0', fontSize: 13.5, color: 'var(--danger)', lineHeight: 1.6 }}>
          🔴 บ้านนี้ปักหมุดกลุ่มเปราะบาง ({(household.vulnerableTypes || []).join(', ')}) — เจ้าหน้าที่จะช่วยอพยพก่อนเมื่อเกิดภัยพิบัติ
        </div>
      )}

      {/* CTA เยียวยาภัยพิบัติ — เด่นสุด */}
      <button onClick={() => navigate('/relief')} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(100deg,#FFF6E9,#FFFDFA)', border: '1.5px solid var(--amber)', borderRadius: 16, padding: '18px 20px', marginTop: 16, boxShadow: '0 1px 3px rgba(16,24,40,.05)' }}>
        <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><ReliefIcon color="var(--amber)" size={24} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16.5, color: '#122A4A' }}>ยื่นขอเงินเยียวยาน้ำท่วม (คลิกเดียว)</div>
          <div style={{ fontSize: 13, color: '#52607A' }}>ใช้พิกัด/พร้อมเพย์ที่ผูกไว้แล้ว · แค่ถ่ายรูปความเสียหาย</div>
        </div>
        <span aria-hidden="true" style={{ color: 'var(--amber)', fontWeight: 700, flex: 'none' }}>→</span>
      </button>

      {/* บิลเมือง */}
      <div style={sectionTitle}>💵 ศูนย์รวมบิลเมือง</div>
      <div style={card}>
        {BILLS.map((b) => <Bill key={b.key} b={b} onPay={demo} />)}
        <div style={{ fontSize: 12, color: '#8592A3', marginTop: 10 }}>* ยอดเงินเป็นข้อมูลตัวอย่าง</div>
      </div>

      {/* บริการเรียกใช้ On-Demand */}
      <div style={sectionTitle}>🚚 บริการเรียกใช้ (On-Demand)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        {ONDEMAND.map((s) => <ServiceCard key={s.key} item={s} onClick={demo} />)}
      </div>

      {/* สุขภาพ & สวัสดิการถ้วนหน้า */}
      <div style={sectionTitle}>🩺 สุขภาพสมาชิกบ้าน & สวัสดิการถ้วนหน้า</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        {[...HEALTH, ...WELFARE].map((s) => <ServiceCard key={s.key} item={s} onClick={demo} />)}
      </div>

      {/* Welfare Tracker — เฉพาะบ้านกลุ่มเปราะบาง */}
      {household.vulnerable && (
        <>
          <div style={sectionTitle}>♿ ติดตามสิทธิ์กลุ่มเปราะบาง (Welfare Tracker)</div>
          <div style={card}>
            {TRACKER.map((t) => (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                <span aria-hidden="true" style={{ fontSize: 22, flex: 'none' }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 14.5 }}>{t.label}</div>
                  <div style={{ fontSize: 12.5, color: t.c, fontWeight: 600 }}>{t.status}</div>
                </div>
                <button onClick={demo} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 'none' }}>ดู →</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* บริการชุมชน + คุยกับใจ */}
      <div style={sectionTitle}>🤝 บริการชุมชน & ดูแลใจ</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        <button onClick={() => navigate('/share')} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}>
          <ShareIcon color="var(--primary)" size={22} />
          <div><div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>ศูนย์แบ่งปัน & รับงานอาสา</div><div style={{ fontSize: 12.5, color: '#52607A' }}>ขอรับ/แบ่งปันสิ่งของ · หางาน-รับงานในชุมชน</div></div>
        </button>
        <button onClick={() => navigate('/mind-talk')} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}>
          <MindIcon color="var(--safe)" size={22} />
          <div><div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>คุยกับใจ</div><div style={{ fontSize: 12.5, color: '#52607A' }}>ประเมินสุขภาพจิตเบื้องต้น</div></div>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 22, justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/onboarding')} style={{ background: 'none', border: 'none', color: '#8592A3', fontSize: 13.5, cursor: 'pointer', textDecoration: 'underline' }}>แก้ไขข้อมูลบ้าน / พิกัด</button>
        <button onClick={() => navigate('/staff')} style={{ background: 'none', border: 'none', color: '#B0B9C6', fontSize: 12.5, cursor: 'pointer' }}>สำหรับเจ้าหน้าที่ →</button>
      </div>
    </main>
  );
}
