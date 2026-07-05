import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ReliefIcon, MindIcon, ShareIcon } from '../components/Icons';
import { genRef } from '../lib/helpers';
import { insertPayment, fetchPayments, notifyLine } from '../lib/db';
import { notifyCard, row, SITE } from '../lib/flex';
import QrBox from '../components/QrBox';

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(18px,3vw,24px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const sectionTitle = { fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '26px 0 12px', letterSpacing: .3 };

const WATER_LIFF = 'https://liff.line.me/1657011309-jNZ1Pak0';
const THB = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 0 });

// ค่าน้ำ 6 เดือนล่าสุด (ตัวอย่าง — ของจริงดึงจากกองการประปา)
const WATER_HISTORY = [
  { m: 'ก.พ.', v: 118 }, { m: 'มี.ค.', v: 142 }, { m: 'เม.ย.', v: 165 },
  { m: 'พ.ค.', v: 138 }, { m: 'มิ.ย.', v: 152 }, { m: 'ก.ค.', v: 174 },
];

// บิลที่ชำระในเว็บได้ (มี amountValue) + บิลที่ต่อ LIFF ภายนอก
const BILLS = [
  { key: 'trash', label: 'ค่าธรรมเนียมขยะ', amountValue: 40, due: 'ครบกำหนด 25 ก.ค. 2569', color: '#B36B00' },
  { key: 'landtax', label: 'ภาษีที่ดินและสิ่งปลูกสร้าง', amountValue: 1250, due: 'ประเมินปี 2569 · ชำระภายใน ส.ค.', color: '#5B54C9' },
];

const ONDEMAND = [
  { key: 'septic', icon: '🚽', label: 'เรียกรถสูบสิ่งปฏิกูล', sub: 'สูบส้วม · ปักหมุดให้รถเทศบาลไปถูกบ้าน' },
  { key: 'tree', icon: '🌳', label: 'ตัดต้นไม้ใหญ่', sub: 'ถ่ายรูปต้นไม้ ปักหมุด เทศบาลจัดคิวรถ' },
  { key: 'bulky', icon: '🛋️', label: 'เก็บขยะชิ้นใหญ่', sub: 'ที่นอนเก่า/เฟอร์นิเจอร์ · นัดวันเก็บ' },
];

const WELFARE = [
  { key: 'elder', icon: '👴', label: 'เบี้ยยังชีพผู้สูงอายุ', sub: 'ลงทะเบียน/ตรวจสอบสิทธิ์รายเดือน' },
  { key: 'disable', icon: '♿', label: 'เบี้ยความพิการ', sub: 'ตรวจสอบสิทธิ์ · เตือนต่ออายุบัตร' },
  { key: 'newborn', icon: '👶', label: 'เงินอุดหนุนเด็กแรกเกิด', sub: 'เช็คสถานะเงินเข้า 600 บาท/เดือน' },
];

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

// มินิกราฟแท่งค่าน้ำรายเดือน
function WaterChart() {
  const max = Math.max(...WATER_HISTORY.map((w) => w.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96, padding: '4px 2px 0' }}>
      {WATER_HISTORY.map((w, i) => {
        const last = i === WATER_HISTORY.length - 1;
        return (
          <div key={w.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10.5, color: last ? 'var(--primary)' : '#8592A3', fontWeight: last ? 700 : 500 }}>{w.v}</div>
            <div style={{ width: '100%', height: `${Math.round((w.v / max) * 66)}px`, background: last ? 'var(--primary)' : 'rgba(14,131,144,.28)', borderRadius: '5px 5px 0 0' }} />
            <div style={{ fontSize: 10.5, color: '#8592A3' }}>{w.m}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function CivicWallet() {
  const navigate = useNavigate();
  const { household, profile, hasVulnerable, showToast } = useApp();
  const phone = household?.phone || profile?.phone || '';

  const [paidKeys, setPaidKeys] = useState([]);      // บิลที่จ่ายแล้ว (จาก payments)
  const [payBill, setPayBill] = useState(null);      // บิลที่กำลังจ่าย (เปิด modal)
  const [paying, setPaying] = useState(false);
  const demo = () => showToast('บริการตัวอย่าง — จะเชื่อมระบบจริงของเทศบาลในเฟสถัดไป');

  useEffect(() => {
    let alive = true;
    if (phone) fetchPayments(phone).then((rows) => { if (alive) setPaidKeys(rows.map((r) => r.bill_key)); });
    return () => { alive = false; };
  }, [phone]);

  const confirmPay = async () => {
    if (!payBill || paying) return;
    setPaying(true);
    const ref = genRef('PAY', 8);
    const amount = payBill.amountValue;
    await insertPayment({ phone, householdPhone: phone, billKey: payBill.key, label: payBill.label, amount, ref, method: 'promptpay' });
    // แจ้งเตือน + สลิปเข้า LINE (การ์ดสีเขียว = ยามปกติ)
    notifyLine(phone, `✅ ชำระ${payBill.label} ${THB(amount)} บาท สำเร็จ`, notifyCard({
      accent: '#0E8A5F',
      badge: '✅ ชำระเงินสำเร็จ',
      bigLabel: 'จำนวนเงิน',
      bigValue: `${THB(amount)} บาท`,
      rows: [
        row('รายการ', payBill.label),
        row('เลขที่อ้างอิง', ref),
        row('ช่องทาง', 'พร้อมเพย์ QR'),
        row('สถานะ', 'ชำระสำเร็จ', '#0E8A5F'),
        row('วันที่', new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })),
      ],
      buttonLabel: 'ดูประวัติการชำระ',
      buttonUri: `${SITE}/payments?openExternalBrowser=1`,
    }));
    setPaidKeys((k) => [...k, payBill.key]);
    setPaying(false);
    setPayBill(null);
    showToast('ชำระเงินสำเร็จ · ส่งสลิปเข้า LINE แล้ว 🧾');
  };

  const copyQr = () => {
    const payload = `PROMPTPAY|${household?.promptpayAccount || phone}|${payBill?.amountValue || 0}`;
    try { navigator.clipboard.writeText(payload); showToast('คัดลอกข้อมูล QR แล้ว · ไปสแกน/วางในแอปธนาคารได้'); }
    catch { showToast('คัดลอกไม่สำเร็จ · สแกน QR บนจอได้เลย'); }
  };

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
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(20px,4vw,36px) 16px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏡</span>
        <div>
          <h1 style={{ fontSize: 'clamp(21px,3.4vw,27px)' }}>กระเป๋าเมือง & บิลของบ้าน</h1>
          <div style={{ fontSize: 13, color: '#52607A' }}>{household.name || 'ครัวเรือนของคุณ'} · {household.address || 'บ้านของคุณ'}</div>
        </div>
      </div>

      {hasVulnerable && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 12, padding: '13px 15px', margin: '14px 0 0', fontSize: 13.5, color: 'var(--danger)', lineHeight: 1.6 }}>
          🔴 บ้านนี้มีสมาชิกกลุ่มเปราะบาง — <button onClick={() => navigate('/share?tab=welfare')} style={{ background: 'none', border: 'none', color: 'var(--danger)', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', font: 'inherit', padding: 0 }}>ดูสิทธิ์กายอุปกรณ์ →</button>
        </div>
      )}

      {/* CTA เยียวยาภัยพิบัติ */}
      <button onClick={() => navigate('/relief')} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(100deg,#FFF6E9,#FFFDFA)', border: '1.5px solid var(--amber)', borderRadius: 16, padding: '18px 20px', marginTop: 16, boxShadow: '0 1px 3px rgba(16,24,40,.05)' }}>
        <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><ReliefIcon color="var(--amber)" size={24} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16.5, color: '#122A4A' }}>ยื่นขอเงินเยียวยาน้ำท่วม (คลิกเดียว)</div>
          <div style={{ fontSize: 13, color: '#52607A' }}>ใช้พิกัด/พร้อมเพย์ที่ผูกไว้แล้ว · แค่ถ่ายรูปความเสียหาย</div>
        </div>
        <span aria-hidden="true" style={{ color: 'var(--amber)', fontWeight: 700, flex: 'none' }}>→</span>
      </button>

      {/* ค่าน้ำประปา — กราฟ + ต่อ LIFF */}
      <div style={sectionTitle}>💧 ค่าน้ำประปารายเดือน</div>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: 13.5, color: '#52607A' }}>รอบล่าสุด (ก.ค. 2569)</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', fontFamily: "'IBM Plex Sans Thai'" }}>{THB(174)} บาท</span>
        </div>
        <WaterChart />
        <a href={WATER_LIFF} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, background: '#06C755', color: '#fff', textDecoration: 'none', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 15.5, minHeight: 48 }}>
          💧 ชำระค่าน้ำผ่าน LINE เทศบาล →
        </a>
        <div style={{ fontSize: 11.5, color: '#8592A3', marginTop: 8, textAlign: 'center' }}>เปิดระบบชำระค่าน้ำของเทศบาลใน LINE โดยตรง</div>
      </div>

      {/* บิลอื่น — จ่ายในเว็บ */}
      <div style={sectionTitle}>💵 บิลค้างชำระ</div>
      <div style={card}>
        {BILLS.map((b) => {
          const paid = paidKeys.includes(b.key);
          return (
            <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: paid ? 'var(--safe)' : b.color, flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>{b.label}</div>
                <div style={{ fontSize: 12.5, color: '#52607A' }}>{paid ? '✓ ชำระแล้ว · ดูสลิปในประวัติ' : b.due}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontWeight: 700, color: paid ? 'var(--safe)' : b.color, fontSize: 15, whiteSpace: 'nowrap' }}>{THB(b.amountValue)} ฿</div>
                {paid
                  ? <span style={{ fontSize: 12, color: 'var(--safe)', fontWeight: 700 }}>ชำระแล้ว</span>
                  : <button onClick={() => setPayBill(b)} style={{ background: 'var(--primary)', border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, marginTop: 2 }}>จ่ายเงิน</button>}
              </div>
            </div>
          );
        })}
        <button onClick={() => navigate('/payments')} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 10, textAlign: 'center' }}>🧾 ดูประวัติการชำระเงินทั้งหมด →</button>
      </div>

      {/* บริการเรียกใช้ On-Demand */}
      <div style={sectionTitle}>🚚 บริการเรียกใช้ (On-Demand)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {ONDEMAND.map((s) => <ServiceCard key={s.key} item={s} onClick={demo} />)}
      </div>

      {/* สวัสดิการถ้วนหน้า */}
      <div style={sectionTitle}>🩺 สวัสดิการสมาชิกบ้าน</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {WELFARE.map((s) => <ServiceCard key={s.key} item={s} onClick={demo} />)}
      </div>

      {/* บริการชุมชน + คุยกับใจ */}
      <div style={sectionTitle}>🤝 บริการชุมชน & ดูแลใจ</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <button onClick={() => navigate('/share')} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}>
          <ShareIcon color="var(--primary)" size={22} />
          <div><div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>ศูนย์แบ่งปัน & รับงานอาสา</div><div style={{ fontSize: 12.5, color: '#52607A' }}>ขอรับ/แบ่งปันสิ่งของ · หางาน-รับงาน</div></div>
        </button>
        <button onClick={() => navigate('/mind-talk')} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}>
          <MindIcon color="var(--safe)" size={22} />
          <div><div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>คุยกับใจ</div><div style={{ fontSize: 12.5, color: '#52607A' }}>ประเมินสุขภาพจิตเบื้องต้น</div></div>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 22, justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/onboarding')} style={{ background: 'none', border: 'none', color: '#8592A3', fontSize: 13.5, cursor: 'pointer', textDecoration: 'underline' }}>แก้ไขข้อมูลบ้าน / สมาชิก</button>
        <button onClick={() => navigate('/staff')} style={{ background: 'none', border: 'none', color: '#B0B9C6', fontSize: 12.5, cursor: 'pointer' }}>สำหรับเจ้าหน้าที่ →</button>
      </div>

      {/* ===== Modal ชำระเงิน ===== */}
      {payBill && (
        <div role="dialog" aria-modal="true" onClick={() => !paying && setPayBill(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,18,32,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 380, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, color: '#52607A', fontWeight: 600 }}>ชำระ · {payBill.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary)', fontFamily: "'IBM Plex Sans Thai'", margin: '2px 0 14px' }}>{THB(payBill.amountValue)} บาท</div>
            <div style={{ display: 'inline-block', padding: 12, border: '1px solid var(--line)', borderRadius: 14, background: '#fff', marginBottom: 8 }}>
              <QrBox seed={`${payBill.key}-${phone}`} size={168} />
            </div>
            <div style={{ fontSize: 12.5, color: '#52607A', marginBottom: 16 }}>สแกน QR พร้อมเพย์นี้ในแอปธนาคาร หรือกดยืนยันเพื่อจำลองการชำระ</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={copyQr} style={{ flex: 1, background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: 13, borderRadius: 11, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', minHeight: 48 }}>📋 คัดลอก QR</button>
              <button disabled={paying} onClick={confirmPay} style={{ flex: 1.4, background: 'var(--safe)', border: 'none', color: '#fff', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 48 }}>{paying ? 'กำลังชำระ…' : '✓ ยืนยันการชำระ'}</button>
            </div>
            <button onClick={() => !paying && setPayBill(null)} style={{ background: 'none', border: 'none', color: '#8592A3', fontSize: 13.5, cursor: 'pointer', marginTop: 12 }}>ยกเลิก</button>
          </div>
        </div>
      )}
    </main>
  );
}
