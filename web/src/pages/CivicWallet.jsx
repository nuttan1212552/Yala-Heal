import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ReliefIcon, MindIcon, ShareIcon } from '../components/Icons';

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(20px,3vw,26px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };

// บิลตัวอย่าง — สาธิตแนวคิด "ศูนย์รวมบิลเมืองดิจิทัล" (เชื่อม API จริงของกองการประปา/กองคลังภายหลัง)
const MOCK_BILLS = [
  { key: 'water', label: 'ค่าน้ำประปา', amount: '312 บาท', due: 'ครบกำหนด 20 ก.ค. 2569', color: '#0E8A5F' },
  { key: 'trash', label: 'ค่าธรรมเนียมขยะ', amount: '40 บาท/เดือน', due: 'ครบกำหนด 25 ก.ค. 2569', color: '#B36B00' },
  { key: 'landtax', label: 'ภาษีที่ดินและสิ่งปลูกสร้าง', amount: 'ยังไม่ประเมิน', due: 'ประเมินรอบถัดไป ม.ค. 2570', color: '#5B54C9' },
];

function BillRow({ b }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15.5 }}>{b.label}</div>
        <div style={{ fontSize: 13, color: '#52607A' }}>{b.due}</div>
      </div>
      <div style={{ fontWeight: 700, color: b.color, fontSize: 15.5, whiteSpace: 'nowrap' }}>{b.amount}</div>
    </div>
  );
}

export default function CivicWallet() {
  const navigate = useNavigate();
  const { household } = useApp();

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
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏡</span>
        <h1 style={{ fontSize: 'clamp(24px,3.6vw,32px)' }}>กระเป๋าเมืองดิจิทัล</h1>
      </div>
      <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 20px' }}>{household.address || 'บ้านของคุณ'} · พิกัดผูกไว้แล้ว · พร้อมรับเงินเยียวยาอัตโนมัติ</p>

      {household.vulnerable && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, fontSize: 14, color: 'var(--danger)', lineHeight: 1.6 }}>
          🔴 บ้านนี้ถูกปักหมุดกลุ่มเปราะบาง ({(household.vulnerableTypes || []).join(', ')}) — เจ้าหน้าที่จะให้ความช่วยเหลือก่อนเมื่อเกิดภัยพิบัติ
        </div>
      )}

      <div style={{ ...card, marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, marginBottom: 4 }}>บิลประจำเดือน/ปี</h2>
        <p style={{ fontSize: 13, color: '#8592A3', margin: '0 0 8px' }}>ข้อมูลตัวอย่าง — เชื่อมต่อระบบค่าน้ำ/คลังเทศบาลจริงในเฟสถัดไป</p>
        {MOCK_BILLS.map((b) => <BillRow key={b.key} b={b} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
        <button onClick={() => navigate('/relief')} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
          <ReliefIcon color="var(--amber)" size={24} />
          <div><div style={{ fontWeight: 700, color: '#122A4A' }}>ยื่นขอเงินเยียวยา</div><div style={{ fontSize: 13, color: '#52607A' }}>คลิกเดียว — ใช้พิกัด/พร้อมเพย์ที่ผูกไว้แล้ว</div></div>
        </button>
        <button onClick={() => navigate('/mind-talk')} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
          <MindIcon color="var(--safe)" size={24} />
          <div><div style={{ fontWeight: 700, color: '#122A4A' }}>คุยกับใจ</div><div style={{ fontSize: 13, color: '#52607A' }}>ประเมินสุขภาพจิตเบื้องต้น</div></div>
        </button>
        <button onClick={() => navigate('/share')} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
          <ShareIcon color="var(--primary)" size={24} />
          <div><div style={{ fontWeight: 700, color: '#122A4A' }}>ศูนย์แบ่งปัน</div><div style={{ fontSize: 13, color: '#52607A' }}>ขอรับ/แบ่งปันสิ่งของ</div></div>
        </button>
      </div>

      <button onClick={() => navigate('/onboarding')} style={{ marginTop: 18, background: 'none', border: 'none', color: '#8592A3', fontSize: 13.5, cursor: 'pointer', textDecoration: 'underline' }}>แก้ไขข้อมูลบ้าน / พิกัด</button>
    </main>
  );
}
