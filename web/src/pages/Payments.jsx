import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchPayments } from '../lib/db';

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(16px,3vw,22px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const THB = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 });

export default function Payments() {
  const navigate = useNavigate();
  const { household, profile } = useApp();
  const phone = household?.phone || profile?.phone || '';
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!phone) { setRows([]); return; }
    fetchPayments(phone).then((r) => { if (alive) setRows(r); });
    return () => { alive = false; };
  }, [phone]);

  const total = (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(20px,4vw,36px) 16px 72px' }}>
      <button onClick={() => navigate('/civic-wallet')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14.5, cursor: 'pointer', marginBottom: 12, fontWeight: 600 }}>← กลับกระเป๋าเมือง</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--safe-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧾</span>
        <div>
          <h1 style={{ fontSize: 'clamp(21px,3.4vw,27px)' }}>ประวัติการชำระเงิน</h1>
          <div style={{ fontSize: 13, color: '#52607A' }}>เก็บสลิปทุกรายการไว้ตรวจสอบ หากมีข้อผิดพลาด</div>
        </div>
      </div>

      {rows && rows.length > 0 && (
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: 'linear-gradient(120deg,#F4FBF8,#fff)' }}>
          <span style={{ fontSize: 14, color: '#52607A' }}>ชำระไปแล้วทั้งหมด {rows.length} รายการ</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--safe)', fontFamily: "'IBM Plex Sans Thai'" }}>{THB(total)} บาท</span>
        </div>
      )}

      {rows === null ? (
        <div style={{ ...card, textAlign: 'center', color: '#8592A3' }}>กำลังโหลดประวัติ…</div>
      ) : rows.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 700, color: '#122A4A', marginBottom: 4 }}>ยังไม่มีรายการชำระเงิน</div>
          <div style={{ fontSize: 13.5, color: '#52607A', marginBottom: 16 }}>เมื่อชำระบิลในกระเป๋าเมือง รายการจะมาแสดงที่นี่</div>
          <button onClick={() => navigate('/civic-wallet')} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>ไปหน้าบิล</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
              <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--safe-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 18 }}>✅</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: '#8592A3' }}>{r.ref} · {new Date(r.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontWeight: 800, color: 'var(--safe)', fontSize: 15.5, fontFamily: "'IBM Plex Sans Thai'" }}>{THB(r.amount)} ฿</div>
                <div style={{ fontSize: 11.5, color: 'var(--safe)', fontWeight: 700 }}>{r.status || 'ชำระสำเร็จ'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
