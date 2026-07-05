import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { scrollTop, stepBars, PHONE_RE } from '../lib/helpers';
import MapPicker from '../components/MapPicker';

const VULNERABLE_TYPES = ['ผู้สูงอายุ (60 ปีขึ้นไป)', 'ผู้พิการ', 'ผู้ป่วยติดเตียง', 'เด็กเล็ก (แรกเกิด-6 ปี)', 'หญิงตั้งครรภ์', 'ผู้ป่วยเรื้อรัง'];
const RELATIONS = ['หัวหน้าครัวเรือน', 'คู่สมรส', 'บุตร/ธิดา', 'บิดา/มารดา', 'ญาติ', 'อื่น ๆ'];

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(20px,3vw,30px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const inputStyle = { width: '100%', padding: '13px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, color: '#122A4A', minHeight: 50, background: '#fff' };
const label = { display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 6 };
const primaryBtn = { width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16.5, cursor: 'pointer', minHeight: 50 };
const ghostBtn = { background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: '13px 20px', borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 50 };
const optBtn = (on) => ({ textAlign: 'left', cursor: 'pointer', padding: '11px 13px', borderRadius: 10, fontSize: 14.5, fontWeight: 600, minHeight: 46, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });
const chip = (on) => ({ cursor: 'pointer', padding: '8px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600, minHeight: 40, fontFamily: 'inherit', border: on ? '1.5px solid var(--danger)' : '1.5px solid var(--line)', background: on ? 'var(--danger-soft)' : '#fff', color: on ? 'var(--danger)' : '#52607A' });

const STEPS = ['start', 'pdpa', 'water', 'location', 'members'];
const STEP_LABELS = ['หัวหน้าครัวเรือน', 'ยินยอมข้อมูล', 'ที่อยู่บ้าน', 'ปักหมุด', 'สมาชิกในบ้าน'];

const emptyMember = () => ({ fullName: '', nationalId: '', relation: 'บุตร/ธิดา', vulnerableTypes: [] });

export default function Onboarding() {
  const navigate = useNavigate();
  const { showToast, profile, auth, updateProfile, household, saveHousehold, members: savedMembers, saveMembers } = useApp();

  const [stage, setStage] = useState('start');
  const [f, setF] = useState({
    name: profile.name || auth?.name || '',
    phone: profile.phone || '',
    nationalId: profile.nationalId || '',
    pdpaConsent: false,
    waterAccountNo: household?.waterAccountNo || '',
    address: household?.address || '',
    lat: household?.lat || null,
    lng: household?.lng || null,
    promptpayAccount: household?.promptpayAccount || profile.nationalId || '',
  });
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  // สมาชิก: คนแรก = หัวหน้าครัวเรือน (ดึงชื่อ/เลขบัตรจาก step แรก), เพิ่มคนอื่นได้
  const [extra, setExtra] = useState(
    (savedMembers && savedMembers.filter((m) => !m.isHead).length)
      ? savedMembers.filter((m) => !m.isHead).map((m) => ({ fullName: m.fullName, nationalId: m.nationalId || '', relation: m.relation || 'บุตร/ธิดา', vulnerableTypes: m.vulnerableTypes || [] }))
      : [],
  );
  const [headVuln, setHeadVuln] = useState(
    (savedMembers && savedMembers.find((m) => m.isHead)?.vulnerableTypes) || [],
  );

  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const stepIdx = STEPS.indexOf(stage);
  const bars = stepBars(STEPS.length, stepIdx);

  const go = (to) => { setErr(''); setStage(to); scrollTop(); };
  const back = () => (stepIdx > 0 ? go(STEPS[stepIdx - 1]) : navigate('/'));

  const validate = () => {
    if (stage === 'start') {
      if (!f.name.trim()) return 'กรุณากรอกชื่อ-นามสกุลหัวหน้าครัวเรือน';
      if (f.nationalId.replace(/\D/g, '').length !== 13) return 'กรุณากรอกเลขบัตรประชาชนหัวหน้าครัวเรือน 13 หลัก';
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
    if (stage === 'start') updateProfile({ name: f.name.trim(), phone: f.phone.trim(), nationalId: f.nationalId.replace(/\D/g, '') });
    if (stepIdx < STEPS.length - 1) go(STEPS[stepIdx + 1]);
  };

  // ---- จัดการสมาชิกเพิ่มเติม ----
  const addMember = () => setExtra((a) => [...a, emptyMember()]);
  const removeMember = (i) => setExtra((a) => a.filter((_, idx) => idx !== i));
  const setMember = (i, patch) => setExtra((a) => a.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const toggleMemberVuln = (i, t) => setExtra((a) => a.map((m, idx) => idx === i
    ? { ...m, vulnerableTypes: m.vulnerableTypes.includes(t) ? m.vulnerableTypes.filter((x) => x !== t) : [...m.vulnerableTypes, t] }
    : m));
  const toggleHeadVuln = (t) => setHeadVuln((v) => v.includes(t) ? v.filter((x) => x !== t) : [...v, t]);

  const finish = async () => {
    if (saving) return;
    // ตรวจสมาชิกเพิ่มเติม (ถ้ากรอก ต้องมีชื่อ)
    for (const m of extra) {
      if (!m.fullName.trim()) { setErr('กรุณากรอกชื่อสมาชิกทุกคน หรือลบช่องที่ว่างออก'); return; }
      if (m.nationalId && m.nationalId.replace(/\D/g, '').length !== 13) { setErr(`เลขบัตรของ "${m.fullName}" ต้องครบ 13 หลัก`); return; }
    }
    setSaving(true);

    const head = { fullName: f.name.trim(), nationalId: f.nationalId.replace(/\D/g, ''), relation: 'หัวหน้าครัวเรือน', isHead: true, vulnerableTypes: headVuln };
    const others = extra.map((m) => ({ fullName: m.fullName.trim(), nationalId: m.nationalId.replace(/\D/g, ''), relation: m.relation, isHead: false, vulnerableTypes: m.vulnerableTypes }));
    const allMembers = [head, ...others];
    const allVulnTypes = [...new Set(allMembers.flatMap((m) => m.vulnerableTypes))];
    const anyVulnerable = allVulnTypes.length > 0;

    await saveHousehold({
      name: f.name.trim(), phone: f.phone.trim(),
      waterAccountNo: f.waterAccountNo.trim(),
      address: f.address.trim(),
      lat: f.lat, lng: f.lng,
      promptpayAccount: f.promptpayAccount.trim(),
      vulnerable: anyVulnerable,
      vulnerableTypes: allVulnTypes,
      pdpaConsent: true,
    });
    await saveMembers(allMembers);
    updateProfile({ name: f.name.trim(), phone: f.phone.trim(), nationalId: f.nationalId.replace(/\D/g, ''), zone: profile.zone || f.address.trim() });
    setSaving(false);
    showToast(`ลงทะเบียนบ้านดิจิทัลสำเร็จ · ${allMembers.length} คน 🏡`);
    navigate('/');
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏡</span>
        <h1 style={{ fontSize: 'clamp(24px,3.6vw,32px)' }}>สำมะโนครัวดิจิทัล</h1>
      </div>
      <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 6px' }}>ลงทะเบียนผูกบ้านครั้งเดียว ใช้ได้ตลอด — เช็คบิลค่าน้ำ/ขยะ/ภาษี รับเงินเยียวยา และรักษาสิทธิ์สวัสดิการของสมาชิกทุกคน</p>

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
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>ยืนยันตัวตนด้วย LINE แล้ว · กรอกข้อมูลของเจ้าบ้าน (ใช้เป็นบัญชีประจำครัวเรือน)</p>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="ob-name">ชื่อ-นามสกุล หัวหน้าครัวเรือน</label>
            <input id="ob-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="ชื่อจริง-นามสกุล" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="ob-id">เลขบัตรประชาชน 13 หลัก</label>
            <input id="ob-id" type="tel" inputMode="numeric" maxLength={13} value={f.nationalId} onChange={(e) => set({ nationalId: e.target.value.replace(/\D/g, '') })} placeholder="x xxxx xxxxx xx x" style={{ ...inputStyle, letterSpacing: 1 }} />
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
            ระบบจะเชื่อมข้อมูลค่าน้ำประปา ค่าขยะ และภาษีที่ดินของบ้านคุณ เข้ากับพิกัด GPS และเลขพร้อมเพย์ เพื่อให้เทศบาลช่วยเหลือและเยียวยาได้รวดเร็วเมื่อเกิดภัยพิบัติ ข้อมูลของสมาชิก (เลขบัตร/ความเปราะบาง) จะถูกเก็บอย่างปลอดภัยและเข้าถึงได้เฉพาะเจ้าหน้าที่ที่เกี่ยวข้องเท่านั้น
          </p>
          <button onClick={() => set({ pdpaConsent: !f.pdpaConsent })} style={{ ...optBtn(f.pdpaConsent), width: '100%', padding: '13px 14px', fontSize: 15 }}>
            <span aria-hidden="true">{f.pdpaConsent ? '☑' : '☐'}</span> ฉันยินยอมให้เชื่อมโยงและจัดเก็บข้อมูลตามที่ระบุ
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
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>ที่อยู่บ้าน / รหัสผู้ใช้น้ำ</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>กรอกเลขที่ใช้เช็คค่าน้ำเดิม (ถ้ามี) เพื่อดึงข้อมูลค่าน้ำอัตโนมัติ — ไม่มีก็ข้ามช่องนี้ได้</p>
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

      {stage === 'members' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>สมาชิกในครัวเรือน</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>กรอกสมาชิกทุกคนที่อาศัยในบ้านหลังนี้ และติ๊กว่าใครเป็น <b style={{ color: 'var(--danger)' }}>กลุ่มเปราะบาง</b> — ระบบจะเปิดสิทธิ์กายอุปกรณ์ (เตียง/ผ้าอ้อม) และปักหมุดพิเศษให้เจ้าหน้าที่อพยพก่อนเมื่อเกิดภัย</p>

          {/* หัวหน้าครัวเรือน (คนแรก — อ่านจาก step แรก) */}
          <div style={{ border: '1.5px solid var(--primary)', borderRadius: 12, padding: 16, marginBottom: 14, background: 'var(--primary-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--primary)', padding: '3px 10px', borderRadius: 100 }}>หัวหน้าครัวเรือน</span>
              <b style={{ color: '#122A4A', fontSize: 15 }}>{f.name || 'ยังไม่ระบุชื่อ'}</b>
            </div>
            <div style={{ fontSize: 13, color: '#52607A', marginBottom: 10 }}>เลขบัตร: {f.nationalId ? f.nationalId.replace(/^(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})$/, '$1-$2-$3-$4-$5') : '—'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#33415A', marginBottom: 8 }}>เป็นกลุ่มเปราะบางไหม? (ถ้ามี ติ๊กได้)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {VULNERABLE_TYPES.map((t) => <button key={t} onClick={() => toggleHeadVuln(t)} style={chip(headVuln.includes(t))}>{headVuln.includes(t) ? '✓ ' : ''}{t}</button>)}
            </div>
          </div>

          {/* สมาชิกเพิ่มเติม */}
          {extra.map((m, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, marginBottom: 14, position: 'relative' }}>
              <button onClick={() => removeMember(i)} aria-label="ลบสมาชิก" style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#B0B9C6', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#52607A', marginBottom: 10 }}>สมาชิกคนที่ {i + 2}</div>
              <div style={{ display: 'grid', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={label}>ชื่อ-นามสกุล</label>
                  <input value={m.fullName} onChange={(e) => setMember(i, { fullName: e.target.value })} placeholder="ชื่อจริง-นามสกุล" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                  <div>
                    <label style={label}>เลขบัตรประชาชน (ถ้ามี)</label>
                    <input type="tel" inputMode="numeric" maxLength={13} value={m.nationalId} onChange={(e) => setMember(i, { nationalId: e.target.value.replace(/\D/g, '') })} placeholder="13 หลัก" style={{ ...inputStyle, letterSpacing: 1 }} />
                  </div>
                  <div>
                    <label style={label}>ความสัมพันธ์</label>
                    <select value={m.relation} onChange={(e) => setMember(i, { relation: e.target.value })} style={inputStyle}>
                      {RELATIONS.filter((r) => r !== 'หัวหน้าครัวเรือน').map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#33415A', marginBottom: 8 }}>เป็นกลุ่มเปราะบางไหม?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {VULNERABLE_TYPES.map((t) => <button key={t} onClick={() => toggleMemberVuln(i, t)} style={chip(m.vulnerableTypes.includes(t))}>{m.vulnerableTypes.includes(t) ? '✓ ' : ''}{t}</button>)}
              </div>
            </div>
          ))}

          <button onClick={addMember} style={{ width: '100%', background: '#fff', border: '1.5px dashed var(--primary)', color: 'var(--primary)', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: 'pointer', minHeight: 50, marginBottom: 8 }}>+ เพิ่มสมาชิกในบ้าน</button>

          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: '4px 0 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button disabled={saving} onClick={finish} style={{ ...primaryBtn, flex: 1 }}>{saving ? 'กำลังบันทึก…' : 'บันทึกและเสร็จสิ้น'}</button>
          </div>
        </div>
      )}
    </main>
  );
}
