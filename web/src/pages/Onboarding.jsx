import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { scrollTop, stepBars, PHONE_RE } from '../lib/helpers';
import MapPicker from '../components/MapPicker';

const VULNERABLE_TYPES = ['ผู้สูงอายุ (60 ปีขึ้นไป)', 'ผู้พิการ', 'ผู้ป่วยติดเตียง', 'เด็กเล็ก (แรกเกิด-6 ปี)'];

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(22px,3vw,32px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const inputStyle = { width: '100%', padding: '13px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, color: '#122A4A', minHeight: 50, background: '#fff' };
const label = { display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 6 };
const primaryBtn = { width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16.5, cursor: 'pointer', minHeight: 50 };
const ghostBtn = { background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: '13px 20px', borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 50 };
const optBtn = (on) => ({ textAlign: 'left', cursor: 'pointer', padding: '13px 14px', borderRadius: 11, fontSize: 15, fontWeight: 600, minHeight: 50, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });

const STEPS = ['start', 'pdpa', 'water', 'location', 'vulnerable'];
const STEP_LABELS = ['เริ่มต้น', 'ยินยอมข้อมูล', 'เลขที่บ้าน', 'ปักหมุดบ้าน', 'กลุ่มเปราะบาง'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { showToast, profile, auth, updateProfile, household, saveHousehold } = useApp();

  const [stage, setStage] = useState('start');
  const [f, setF] = useState({
    name: profile.name || auth?.name || '',
    phone: profile.phone || '',
    pdpaConsent: false,
    waterAccountNo: household?.waterAccountNo || '',
    address: household?.address || '',
    lat: household?.lat || null,
    lng: household?.lng || null,
    promptpayAccount: household?.promptpayAccount || profile.nationalId || '',
    vulnerable: household?.vulnerable || false,
    vulnerableTypes: household?.vulnerableTypes || [],
  });
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const stepIdx = STEPS.indexOf(stage);
  const bars = stepBars(STEPS.length, stepIdx);

  const go = (to) => { setErr(''); setStage(to); scrollTop(); };
  const back = () => (stepIdx > 0 ? go(STEPS[stepIdx - 1]) : navigate('/'));

  const validate = () => {
    if (stage === 'start') {
      if (!f.name.trim()) return 'กรุณากรอกชื่อ-นามสกุลหัวหน้าครัวเรือน';
      if (!PHONE_RE.test(f.phone.trim())) return 'กรุณากรอกเบอร์โทร 10 หลักให้ถูกต้อง';
      return '';
    }
    if (stage === 'pdpa' && !f.pdpaConsent) return 'กรุณายอมรับความยินยอมเพื่อเชื่อมโยงข้อมูลค่าน้ำ/สวัสดิการก่อน';
    if (stage === 'water' && !f.address.trim()) return 'กรุณากรอกที่อยู่บ้าน (เลขที่บ้าน/หมู่/ชุมชน)';
    if (stage === 'location') {
      if (!f.lat || !f.lng) return 'กรุณาปักหมุดตำแหน่งบ้านบนแผนที่';
      if (!f.promptpayAccount.trim()) return 'กรุณากรอกเลขพร้อมเพย์ (ใช้รับเงินเยียวยาอัตโนมัติ)';
      return '';
    }
    return '';
  };

  const onNext = () => {
    const e = validate();
    if (e) { setErr(e); return; }
    if (stage === 'start') updateProfile({ name: f.name.trim(), phone: f.phone.trim() });
    if (stepIdx < STEPS.length - 1) go(STEPS[stepIdx + 1]);
  };

  const toggleVulnType = (t) => set({
    vulnerableTypes: f.vulnerableTypes.includes(t) ? f.vulnerableTypes.filter((x) => x !== t) : [...f.vulnerableTypes, t],
    vulnerable: true,
  });

  const finish = async (hasVulnerable) => {
    if (saving) return;
    setSaving(true);
    await saveHousehold({
      name: f.name.trim(), phone: f.phone.trim(),
      waterAccountNo: f.waterAccountNo.trim(),
      address: f.address.trim(),
      lat: f.lat, lng: f.lng,
      promptpayAccount: f.promptpayAccount.trim(),
      vulnerable: hasVulnerable ? f.vulnerableTypes.length > 0 : false,
      vulnerableTypes: hasVulnerable ? f.vulnerableTypes : [],
      pdpaConsent: true,
    });
    updateProfile({ name: f.name.trim(), phone: f.phone.trim(), zone: profile.zone || f.address.trim() });
    setSaving(false);
    showToast('ลงทะเบียนบ้านดิจิทัลสำเร็จ 🏡');
    navigate('/civic-wallet');
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏡</span>
        <h1 style={{ fontSize: 'clamp(24px,3.6vw,32px)' }}>สำมะโนครัวดิจิทัล</h1>
      </div>
      <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 6px' }}>ลงทะเบียนผูกบ้านครั้งเดียว ใช้ได้ตลอด — เช็คบิลค่าน้ำ/ขยะ/ภาษี และรับเงินเยียวยาอัตโนมัติเมื่อเกิดภัยพิบัติ</p>

      <div style={{ display: 'flex', gap: 6, margin: '18px 0 6px' }}>{bars.map((s, i) => <div key={i} style={s} />)}</div>
      <div style={{ fontSize: 13, color: '#52607A', marginBottom: 20 }}>ขั้นที่ {stepIdx + 1}/{STEPS.length} · {STEP_LABELS[stepIdx]}</div>

      {stage === 'start' && (
        <div style={card}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--primary-soft)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <span aria-hidden="true" style={{ fontSize: 22, flex: 'none' }}>🏠</span>
            <div style={{ fontSize: 14, color: '#243B5E', lineHeight: 1.6 }}>
              <b>ลงทะเบียน 1 ครัวเรือน = 1 บัญชี</b><br />
              กรุณาลงทะเบียนโดย <b>หัวหน้าครัวเรือน</b> (ผู้มีชื่อเป็นเจ้าบ้าน) หนึ่งบ้านผูกได้หนึ่งบัญชีเท่านั้น เพื่อป้องกันการสวมสิทธิ์และการรับเงินเยียวยาซ้ำซ้อน
            </div>
          </div>
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>ข้อมูลหัวหน้าครัวเรือน</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>ยืนยันตัวตนด้วย LINE แล้ว · กรอกชื่อและเบอร์ติดต่อของบ้านหลังนี้ (ใช้เป็นบัญชีประจำครัวเรือน)</p>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="ob-name">ชื่อ-นามสกุล หัวหน้าครัวเรือน</label>
            <input id="ob-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="ชื่อจริง-นามสกุล" style={inputStyle} />
          </div>
          <div>
            <label style={label} htmlFor="ob-phone">เบอร์โทรศัพท์ติดต่อ</label>
            <input id="ob-phone" type="tel" inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '') })} placeholder="เช่น 0812345678" style={inputStyle} />
          </div>
          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: '12px 0 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={back} style={ghostBtn}>ยกเลิก</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {stage === 'pdpa' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>ความยินยอมเชื่อมโยงข้อมูล (PDPA)</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>
            ระบบจะเชื่อมข้อมูลค่าน้ำประปา ค่าขยะ และภาษีที่ดินของบ้านคุณ เข้ากับพิกัด GPS และเลขพร้อมเพย์ เพื่อให้เทศบาลช่วยเหลือและเยียวยาได้รวดเร็วเมื่อเกิดภัยพิบัติ ข้อมูลสุขภาพ (ถ้ามี) จะถูกเก็บแยกและเข้าถึงได้เฉพาะเจ้าหน้าที่ที่เกี่ยวข้องเท่านั้น
          </p>
          <button onClick={() => set({ pdpaConsent: !f.pdpaConsent })} style={optBtn(f.pdpaConsent)}>
            <span aria-hidden="true">{f.pdpaConsent ? '☑' : '☐'}</span> ฉันยินยอมให้เชื่อมโยงข้อมูลตามที่ระบุ
          </button>
          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: '12px 0 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {stage === 'water' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>เลขที่บ้าน / รหัสผู้ใช้น้ำ</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>กรอกเลขที่ใช้เช็คค่าน้ำเดิม (ถ้ามี) เพื่อดึงชื่อหัวหน้าครัวเรือนมาอัตโนมัติ — ไม่มีก็ข้ามช่องนี้ได้</p>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="ob-water">เลขรหัสผู้ใช้น้ำ (ไม่บังคับ)</label>
            <input id="ob-water" value={f.waterAccountNo} onChange={(e) => set({ waterAccountNo: e.target.value })} placeholder="เช่น 095-01234" style={inputStyle} />
          </div>
          <div>
            <label style={label} htmlFor="ob-addr">ที่อยู่บ้าน (บ้านเลขที่ หมู่/ชุมชน)</label>
            <input id="ob-addr" value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="เช่น 123 ชุมชนบ้านร่ม ต.สะเตง" style={inputStyle} />
          </div>
          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: '12px 0 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {stage === 'location' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>ปักหมุดบ้าน + เลขพร้อมเพย์</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 14px', lineHeight: 1.6 }}>ตรวจสอบตำแหน่งบ้านให้ตรงจริง เพื่อให้กู้ภัยหาเจอทันทีเมื่อเกิดภัย และกรอกเลขพร้อมเพย์เพื่อรับเงินเยียวยาอัตโนมัติ</p>
          <MapPicker value={{ lat: f.lat, lng: f.lng }} onChange={({ lat, lng }) => set({ lat, lng })} />
          <div style={{ marginTop: 16 }}>
            <label style={label} htmlFor="ob-pp">เลขพร้อมเพย์ (เลขบัตรประชาชน/เบอร์โทร)</label>
            <input id="ob-pp" value={f.promptpayAccount} onChange={(e) => set({ promptpayAccount: e.target.value })} placeholder="เลขพร้อมเพย์" style={inputStyle} />
          </div>
          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: '12px 0 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {stage === 'vulnerable' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>บ้านหลังนี้มีกลุ่มเปราะบางไหม?</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>ถ้ามี ระบบจะปักหมุดพิเศษ (สีแดง) ให้เจ้าหน้าที่ช่วยอพยพก่อนเมื่อเกิดภัยพิบัติ — ไม่มีก็กด "ไม่มี" ได้เลย</p>
          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            {VULNERABLE_TYPES.map((t) => (
              <button key={t} onClick={() => toggleVulnType(t)} style={optBtn(f.vulnerableTypes.includes(t))}>
                <span aria-hidden="true">{f.vulnerableTypes.includes(t) ? '☑' : '☐'}</span> {t}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button disabled={saving} onClick={() => finish(false)} style={{ ...ghostBtn, flex: 1 }}>ไม่มี · ข้าม</button>
            <button disabled={saving} onClick={() => finish(true)} style={{ ...primaryBtn, flex: 1 }}>{saving ? 'กำลังบันทึก…' : 'บันทึกและเสร็จสิ้น'}</button>
          </div>
        </div>
      )}
    </main>
  );
}
