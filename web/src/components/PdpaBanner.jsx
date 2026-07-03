import { useApp } from '../context/AppContext';

export default function PdpaBanner() {
  const { pdpaAccepted, acceptPdpa, declinePdpa } = useApp();
  if (pdpaAccepted) return null;
  return (
    <div
      role="dialog"
      aria-label="ความยินยอมการใช้ข้อมูลส่วนบุคคล"
      style={{
        position: 'fixed', left: 14, right: 14, bottom: 14, zIndex: 190, maxWidth: 820, margin: '0 auto',
        background: '#fff', border: '1px solid var(--line)', borderRadius: 16,
        boxShadow: '0 18px 44px -12px rgba(18,42,74,.4)', padding: '18px 20px',
        display: 'flex', flexWrap: 'wrap', gap: '14px 20px', alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, minWidth: 230, fontSize: 14, color: '#3A485F', lineHeight: 1.55 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, color: '#122A4A', marginBottom: 2 }}>
          <span aria-hidden="true">🔒</span> การคุ้มครองข้อมูลส่วนบุคคล (PDPA)
        </span>
        <br />
        เว็บไซต์นี้เก็บข้อมูลเท่าที่จำเป็นเพื่อให้บริการช่วยเหลือ แยกเก็บข้อมูลอ่อนไหว (สุขภาพจิต/การเงิน/ที่อยู่) ตามระดับ และขอความยินยอมก่อนใช้งานทุกครั้ง
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={declinePdpa}
          style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#33415A', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', minHeight: 44 }}
        >
          ไม่ยอมรับ
        </button>
        <button
          onClick={acceptPdpa}
          style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 44 }}
        >
          ยอมรับ
        </button>
      </div>
    </div>
  );
}
