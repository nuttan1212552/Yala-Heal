import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PHONE_RE } from '../lib/helpers';

const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, color: '#122A4A', minHeight: 48, background: '#fff' };
const label = { display: 'block', fontSize: 13.5, fontWeight: 600, color: '#33415A', marginBottom: 6 };
const cardWrap = { background: 'linear-gradient(180deg,#fff,#F4FBF8)', border: '1px solid var(--safe-soft)', borderRadius: 16, padding: 'clamp(18px,3vw,24px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };

// การ์ดตัวตนกลาง — เข้าสู่ระบบด้วย LINE ครั้งเดียว ใช้ได้ทั้งเว็บ ตลอดไป
export default function ProfileCard() {
  const { profile, loggedIn, auth, login, logout, updateProfile, connectLineForProfile, showToast } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: profile.name || '', phone: profile.phone || '', zone: profile.zone || '', err: '' });

  const save = () => {
    if (!form.name.trim()) { setForm((f) => ({ ...f, err: 'กรุณากรอกชื่อ-นามสกุล' })); return; }
    if (!PHONE_RE.test(form.phone.trim())) { setForm((f) => ({ ...f, err: 'กรอกเบอร์โทร 10 หลักให้ถูกต้อง' })); return; }
    updateProfile({ name: form.name.trim(), phone: form.phone.trim(), zone: form.zone.trim() });
    setEditing(false); setForm((f) => ({ ...f, err: '' }));
    showToast('บันทึกข้อมูลแล้ว · ครั้งหน้าไม่ต้องกรอกซ้ำ');
  };

  // ยังไม่ล็อกอิน → ปุ่ม LINE เป็นประตูหลัก
  if (!loggedIn) {
    return (
      <div style={cardWrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>🔐</span>
          <div>
            <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 16.5 }}>เข้าสู่ระบบครั้งเดียว ใช้ได้ตลอด</div>
            <div style={{ fontSize: 13, color: '#52607A' }}>ยืนยันตัวตนด้วย LINE · ไม่ต้องกรอกฟอร์ม · ไม่ต้องลงทะเบียนซ้ำทุกครั้ง</div>
          </div>
        </div>
        <button onClick={login} style={{ width: '100%', background: '#06C755', color: '#fff', border: 'none', padding: 15, borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer', minHeight: 52, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>💬</span> เข้าสู่ระบบด้วย LINE
        </button>
        <div style={{ fontSize: 12.5, color: '#8592A3', textAlign: 'center', marginTop: 10 }}>ปลอดภัย · เราเห็นแค่ชื่อและรูปโปรไฟล์ LINE ของคุณ</div>
      </div>
    );
  }

  const needInfo = !profile.name || !profile.phone || editing;

  // ล็อกอินแล้ว
  return (
    <div style={cardWrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: needInfo ? 14 : 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(6,199,85,.12)', color: '#06C755', fontWeight: 700, fontSize: 12.5, padding: '5px 11px', borderRadius: 100 }}>💬 LINE</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 16 }}>สวัสดี {auth?.name || profile.name || 'ผู้ใช้'} 👋</div>
          <div style={{ fontSize: 13, color: '#52607A' }}>เข้าสู่ระบบด้วย LINE แล้ว · ยืนยันตัวตนเรียบร้อย</div>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#8592A3', fontSize: 13, cursor: 'pointer' }}>ออกจากระบบ</button>
      </div>

      {needInfo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13.5, color: '#52607A' }}>กรอกเบอร์ติดต่อครั้งเดียว (จำไว้ใช้ทุกบริการ · รับแจ้งเตือนทาง LINE)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <div><label style={label} htmlFor="pfname">ชื่อ-นามสกุล</label><input id="pfname" style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ชื่อจริง-นามสกุล" /></div>
            <div><label style={label} htmlFor="pfphone">เบอร์โทร</label><input id="pfphone" type="tel" inputMode="numeric" maxLength={10} style={inputStyle} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="เช่น 0812345678" /></div>
            <div><label style={label} htmlFor="pfzone">ตำบล/ชุมชน</label><input id="pfzone" style={inputStyle} value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="เช่น ต.สะเตง" /></div>
          </div>
          {form.err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13.5 }}>{form.err}</div>}
          <button onClick={save} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: 'pointer', minHeight: 48 }}>บันทึกข้อมูลติดต่อ</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>{profile.name} <span style={{ fontWeight: 400, color: '#52607A' }}>· {profile.phone}</span></div>
            {profile.zone && <div style={{ fontSize: 13, color: '#52607A' }}>📍 {profile.zone}</div>}
          </div>
          {profile.lineLinked
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(6,199,85,.12)', color: '#06C755', fontWeight: 700, fontSize: 13, padding: '7px 13px', borderRadius: 100 }}>🔔 รับแจ้งเตือนแล้ว</span>
            : <button onClick={() => connectLineForProfile(profile.phone)} style={{ background: '#06C755', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 40 }}>🔔 เปิดรับแจ้งเตือน</button>}
          <button onClick={() => { setForm({ name: profile.name || '', phone: profile.phone || '', zone: profile.zone || '', err: '' }); setEditing(true); }} style={{ background: '#fff', border: '1.5px solid var(--line)', color: 'var(--primary)', padding: '9px 15px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 40 }}>แก้ไข</button>
        </div>
      )}
    </div>
  );
}
