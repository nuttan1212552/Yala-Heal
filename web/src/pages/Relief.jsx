import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { genRef, scrollTop, stepBars } from '../lib/helpers';
import { insertReliefClaim } from '../lib/db';
import { ReliefIcon } from '../components/Icons';

const DAMAGE_LIST = ['ตัวบ้าน/ที่อยู่', 'เครื่องใช้ไฟฟ้า', 'ยานพาหนะ', 'พื้นที่เกษตร'];
const WATER_LIST = ['ต่ำกว่าเข่า', 'ประมาณเอว', 'สูงกว่าเอว'];
const GRADE_INFO = {
  A: { title: 'ความเสียหายระดับเล็กน้อย', sub: 'น้ำท่วมพื้นที่บางส่วน', c: '#0E8A5F', bg: 'rgba(14,138,95,.1)' },
  B: { title: 'ความเสียหายระดับปานกลาง', sub: 'น้ำท่วมชั้นล่าง ทรัพย์สินบางส่วน', c: '#B36B00', bg: 'rgba(179,107,0,.1)' },
  C: { title: 'ความเสียหายระดับรุนแรง', sub: 'น้ำท่วมสูง กระทบโครงสร้างและทรัพย์สินมาก', c: '#C0362E', bg: 'rgba(192,54,46,.09)' },
};

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(22px,3vw,32px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const inputStyle = { width: '100%', padding: '13px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, color: '#122A4A', minHeight: 50 };
const label = { display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 6 };
const primaryBtn = { width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16.5, cursor: 'pointer', minHeight: 50 };
const optBtn = (on) => ({ textAlign: 'left', cursor: 'pointer', padding: '13px 14px', borderRadius: 11, fontSize: 15, fontWeight: 600, minHeight: 50, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });
const pillBtn = (on) => ({ cursor: 'pointer', padding: '11px 15px', borderRadius: 100, fontSize: 14.5, fontWeight: 600, minHeight: 44, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });

const initialReg = { name: '', id: '', phone: '', consent: false, err: '' };

export default function Relief() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [stage, setStage] = useState('thaid');
  const [reg, setReg] = useState(initialReg);
  const [idMethod, setIdMethod] = useState('');

  const [photos, setPhotos] = useState(0);
  const [photoErr, setPhotoErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const uploadTimer = useRef(null);

  const [damage, setDamage] = useState([]);
  const [water, setWater] = useState('');
  const [addr, setAddr] = useState('');
  const [detErr, setDetErr] = useState('');
  const [analyzePos, setAnalyzePos] = useState(0);
  const [grade, setGrade] = useState('');

  const [appealText, setAppealText] = useState('');
  const [appealErr, setAppealErr] = useState('');

  const [ref, setRef] = useState('');
  const [doneMode, setDoneMode] = useState('confirm');

  useEffect(() => () => { if (uploadTimer.current) clearInterval(uploadTimer.current); }, []);

  const toggleConsent = () => setReg((r) => ({ ...r, consent: !r.consent, err: '' }));

  const submitRegister = () => {
    const name = reg.name.trim();
    const id = reg.id.replace(/\D/g, '');
    const phone = reg.phone.trim();
    if (!name) { setReg((r) => ({ ...r, err: 'กรุณากรอกชื่อ-นามสกุล' })); return; }
    if (id.length !== 13) { setReg((r) => ({ ...r, err: 'กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก' })); return; }
    if (!/^0\d{9}$/.test(phone)) { setReg((r) => ({ ...r, err: 'กรุณากรอกเบอร์โทร 10 หลักให้ถูกต้อง' })); return; }
    if (!reg.consent) { setReg((r) => ({ ...r, err: 'กรุณายอมรับความยินยอมการใช้ข้อมูล (PDPA) ก่อนดำเนินการต่อ' })); return; }
    setReg((r) => ({ ...r, err: '' }));
    setIdMethod('register'); setStage('photo'); scrollTop();
    showToast('ลงทะเบียนสำเร็จ');
  };

  const verifyThaid = () => {
    setIdMethod('thaid'); setReg((r) => ({ ...r, consent: true })); setStage('photo');
    showToast('ยืนยันตัวตน ThaID สำเร็จ');
  };

  const addPhoto = () => { setPhotos((p) => Math.min(3, p + 1)); setPhotoErr(''); };

  const submitPhoto = () => {
    if (uploading) return;
    if (photos < 1) { setPhotoErr('กรุณาถ่ายภาพความเสียหายอย่างน้อย 1 ภาพ'); return; }
    setPhotoErr(''); setUploading(true); setUploadPct(0);
    if (uploadTimer.current) clearInterval(uploadTimer.current);
    uploadTimer.current = setInterval(() => {
      setUploadPct((prev) => {
        const n = Math.min(100, prev + (12 + Math.random() * 16));
        if (n >= 100) {
          clearInterval(uploadTimer.current); uploadTimer.current = null;
          setTimeout(() => { setUploading(false); setStage('details'); scrollTop(); }, 260);
          return 100;
        }
        return n;
      });
    }, 180);
  };

  const submitDetails = () => {
    if (!water) { setDetErr('กรุณาเลือกระดับน้ำโดยประมาณ'); return; }
    const g = water === 'ต่ำกว่าเข่า' ? 'A' : water === 'ประมาณเอว' ? 'B' : 'C';
    const pos = 2 + Math.floor(Math.random() * 6);
    setDetErr(''); setStage('analyzing'); setAnalyzePos(pos); scrollTop();
    setTimeout(() => { setGrade(g); setStage((s) => (s === 'analyzing' ? 'result' : s)); }, 2200);
  };

  const openAppeal = () => { setAppealErr(''); setStage('appeal'); scrollTop(); };
  const backToResult = () => { setStage('result'); scrollTop(); };
  const confirmRelief = () => {
    const newRef = genRef('RL', 6);
    setRef(newRef); setDoneMode('confirm'); setStage('done'); scrollTop();
    showToast('ยืนยันคำร้องเรียบร้อย');
    insertReliefClaim({ ref: newRef, name: reg.name.trim() || null, grade, water, mode: 'confirm' });
  };
  const submitAppeal = () => {
    if (!appealText.trim()) { setAppealErr('กรุณาระบุเหตุผลการอุทธรณ์'); return; }
    const newRef = genRef('AP', 6);
    setRef(newRef); setDoneMode('appeal'); setStage('done'); scrollTop();
    showToast('ส่งอุทธรณ์เรียบร้อย');
    insertReliefClaim({ ref: newRef, name: reg.name.trim() || null, grade, water, mode: 'appeal' });
  };

  const toggleDamage = (t) => setDamage((d) => (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]));

  const resetAll = () => {
    setStage('thaid'); setReg(initialReg); setIdMethod('');
    setPhotos(0); setPhotoErr(''); setUploading(false); setUploadPct(0);
    setDamage([]); setWater(''); setAddr(''); setDetErr(''); setAnalyzePos(0); setGrade('');
    setAppealText(''); setAppealErr(''); setRef(''); setDoneMode('confirm');
    scrollTop();
  };

  const idx = stage === 'thaid' ? 0 : stage === 'photo' ? 1 : stage === 'details' ? 2 : 3;
  const bars = stepBars(4, idx);
  const identityLabel = idMethod === 'thaid' ? 'ยืนยันตัวตนด้วย ThaID เรียบร้อยแล้ว' : `ลงทะเบียนเรียบร้อยแล้ว · ${reg.name.trim() || 'ผู้ยื่นคำร้อง'}`;
  const gInfo = GRADE_INFO[grade || 'B'];
  const reasons = [
    `ระดับน้ำที่ระบุ: ${water || '-'} — เป็นเกณฑ์หลักในการจัดระดับ`,
    `ทรัพย์สินที่เสียหาย: ${damage.length ? damage.join(', ') : 'ไม่ได้ระบุ'}`,
    'พื้นที่อยู่ในเขตประกาศภัยพิบัติของเทศบาล',
    'ภาพถ่ายมี metadata เวลา-พิกัด ตรงกับช่วงเหตุการณ์',
  ];

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ReliefIcon color="var(--amber)" size={24} />
        </span>
        <h1 style={{ fontSize: 'clamp(24px,3.6vw,32px)' }}>ระบบเงินเยียวยา</h1>
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '18px 0 24px' }}>{bars.map((s, i) => <div key={i} style={s} />)}</div>

      {stage === 'thaid' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 8 }}>ลงทะเบียนผู้ยื่นคำร้อง</h2>
          <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 22px' }}>ประชาชนทั่วไปกรอกข้อมูลลงทะเบียนได้ทันที หรือหากมีแอป ThaID จะยืนยันตัวตนแบบรวดเร็วก็ได้เช่นกัน</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label htmlFor="rgname" style={label}>ชื่อ-นามสกุล</label><input id="rgname" value={reg.name} onChange={(e) => setReg((r) => ({ ...r, name: e.target.value }))} placeholder="ชื่อ นามสกุล" style={inputStyle} /></div>
            <div><label htmlFor="rgid" style={label}>เลขบัตรประชาชน 13 หลัก</label><input id="rgid" type="tel" inputMode="numeric" maxLength={13} value={reg.id} onChange={(e) => setReg((r) => ({ ...r, id: e.target.value }))} placeholder="x xxxx xxxxx xx x" style={{ ...inputStyle, letterSpacing: 1 }} /></div>
            <div><label htmlFor="rgphone" style={label}>เบอร์โทรศัพท์</label><input id="rgphone" type="tel" inputMode="numeric" maxLength={10} value={reg.phone} onChange={(e) => setReg((r) => ({ ...r, phone: e.target.value }))} placeholder="เช่น 0812345678" style={inputStyle} /></div>
          </div>
          <label htmlFor="rgconsent" style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 18, cursor: 'pointer', fontSize: 14, color: '#3A485F', lineHeight: 1.55, background: 'var(--primary-soft)', borderRadius: 11, padding: 14 }}>
            <input id="rgconsent" type="checkbox" checked={reg.consent} onChange={toggleConsent} style={{ width: 20, height: 20, marginTop: 1, flex: 'none', accentColor: 'var(--primary)', cursor: 'pointer' }} />
            <span>ข้าพเจ้ายินยอมให้เทศบาลนครยะลาเก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคล รวมถึงเลขบัตรประชาชน ภาพถ่ายความเสียหาย และที่อยู่ เพื่อพิจารณาการเยียวยา ตาม<b>นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</b></span>
          </label>
          {reg.err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 12 }}>{reg.err}</div>}
          <button onClick={submitRegister} style={{ ...primaryBtn, marginTop: 18 }}>ลงทะเบียนและดำเนินการต่อ</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} /><span style={{ fontSize: 13, color: '#8592A3' }}>หรือ</span><span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <button onClick={verifyThaid} style={{ width: '100%', background: '#fff', border: '1.5px solid var(--primary)', color: 'var(--primary)', padding: 14, borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: 'pointer', minHeight: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>ID</span> ยืนยันด้วย ThaID (ถ้ามี)
          </button>
        </div>
      )}

      {stage === 'photo' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--safe)', fontSize: 14, fontWeight: 600, marginBottom: 16 }}><span aria-hidden="true">✓</span> {identityLabel}</div>
          <h2 style={{ fontSize: 21, marginBottom: 8 }}>ถ่ายภาพความเสียหาย</h2>
          <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 20px' }}>ถ่ายภาพสดผ่านกล้อง ระบบจะฝัง metadata เวลา-พิกัด เพื่อป้องกันการใช้ภาพเก่าหรือภาพปลอม (ถ่ายได้สูงสุด 3 ภาพ)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {Array.from({ length: 3 }, (_, i) => {
              const filled = i < photos;
              return <div key={i} style={{ aspectRatio: '1', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, border: filled ? 'none' : '1.5px dashed #C3CDDA', background: filled ? 'var(--primary-soft)' : '#F4F6F9', color: 'var(--primary)' }}>{filled ? '✓' : ''}</div>;
            })}
          </div>
          {!uploading && photos < 3 && <button onClick={addPhoto} style={{ width: '100%', background: '#fff', border: '1.5px solid var(--primary)', color: 'var(--primary)', padding: 14, borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 14, minHeight: 50 }}>📷 ถ่ายภาพ ({photos}/3)</button>}
          {uploading && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#52607A', marginBottom: 7 }}><span>กำลังบีบอัดและอัปโหลดภาพอย่างปลอดภัย…</span><span>{Math.round(uploadPct)}%</span></div>
              <div style={{ height: 8, background: 'var(--primary-soft)', borderRadius: 100, overflow: 'hidden' }}><div style={{ width: uploadPct + '%', height: '100%', background: 'var(--primary)', borderRadius: 100, transition: 'width .18s' }} /></div>
            </div>
          )}
          {uploading
            ? <button disabled style={{ width: '100%', background: '#9FB2C9', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16.5, minHeight: 50, cursor: 'not-allowed' }}>กำลังอัปโหลด…</button>
            : (
              <>
                <button onClick={submitPhoto} style={primaryBtn}>ถัดไป</button>
                {photoErr && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 10, textAlign: 'center' }}>{photoErr}</div>}
              </>
            )}
        </div>
      )}

      {stage === 'details' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 20 }}>รายละเอียดความเสียหาย</h2>
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 10 }}>ทรัพย์สินที่เสียหาย (เลือกได้หลายข้อ)</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {DAMAGE_LIST.map((t) => { const on = damage.includes(t); return <button key={t} onClick={() => toggleDamage(t)} style={pillBtn(on)}><span aria-hidden="true">{on ? '☑' : '☐'}</span> {t}</button>; })}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 10 }}>ระดับน้ำโดยประมาณ</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              {WATER_LIST.map((t) => { const on = water === t; return <button key={t} onClick={() => setWater(t)} style={optBtn(on)}><span aria-hidden="true">{on ? '●' : '○'}</span> {t}</button>; })}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="rladdr" style={label}>ที่อยู่ทรัพย์สิน</label>
            <input id="rladdr" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="บ้านเลขที่ / ถนน / ตำบล" style={inputStyle} />
          </div>
          {detErr && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{detErr}</div>}
          <button onClick={submitDetails} style={primaryBtn}>ส่งประเมิน</button>
        </div>
      )}

      {stage === 'analyzing' && (
        <div style={{ ...card, padding: '60px 28px', textAlign: 'center' }}>
          <div aria-hidden="true" style={{ width: 52, height: 52, margin: '0 auto 20px', border: '4px solid var(--primary-soft)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          <div style={{ fontSize: 16, color: '#3A485F' }}>กำลังประเมินระดับความเสียหาย…</div>
          <div style={{ fontSize: 13.5, color: '#52607A', marginTop: 6 }}>วิเคราะห์ภาพ ระดับน้ำ และข้อมูลพื้นที่</div>
          <div style={{ fontSize: 13, color: '#8592A3', marginTop: 10 }}>คำขอของคุณอยู่ในคิวประเมิน · ลำดับที่ {analyzePos}</div>
        </div>
      )}

      {stage === 'result' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: gInfo.bg, border: '1px solid ' + gInfo.c, borderRadius: 12, padding: 16, marginBottom: 18 }}>
            <div aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, background: gInfo.c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, flex: 'none' }}>{grade}</div>
            <div><div style={{ fontWeight: 700, fontSize: 16, color: '#122A4A' }}>{gInfo.title}</div><div style={{ fontSize: 13.5, color: '#52607A' }}>{gInfo.sub}</div></div>
          </div>
          <div style={{ background: '#F4F6F9', borderRadius: 12, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: '#52607A', marginBottom: 10, fontWeight: 600 }}>เหตุผลการประเมิน (โปร่งใส ตรวจสอบได้)</div>
            {reasons.map((r) => (
              <div key={r} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 14.5, color: '#3A485F', marginBottom: 8, lineHeight: 1.5 }}>
                <span aria-hidden="true" style={{ color: 'var(--primary)', flex: 'none' }}>•</span> {r}
              </div>
            ))}
            <div style={{ fontSize: 12.5, color: '#8592A3', marginTop: 6 }}>* วงเงินจริงพิจารณาโดยเจ้าหน้าที่ตามระเบียบ (ตัวอย่างเพื่อการสาธิต)</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={confirmRelief} style={{ flex: 1, minWidth: 150, background: 'var(--primary)', color: '#fff', border: 'none', padding: 14, borderRadius: 11, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 50 }}>ยืนยันข้อมูล</button>
            <button onClick={openAppeal} style={{ flex: 1, minWidth: 150, background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: 14, borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 50 }}>ไม่เห็นด้วย · ยื่นอุทธรณ์</button>
          </div>
        </div>
      )}

      {stage === 'appeal' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 8 }}>ยื่นอุทธรณ์ผลการประเมิน</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 20px' }}>อธิบายเหตุผลที่ขอทบทวน เจ้าหน้าที่จะพิจารณาใหม่และติดต่อกลับ</p>
          <label htmlFor="rlappeal" style={label}>เหตุผลการอุทธรณ์</label>
          <textarea id="rlappeal" rows={4} value={appealText} onChange={(e) => setAppealText(e.target.value)} placeholder="เช่น ความเสียหายมากกว่าที่ประเมิน มีทรัพย์สินอื่นเพิ่มเติม" style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }} />
          {appealErr && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{appealErr}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={backToResult} style={{ flex: '0 0 auto', background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: '14px 20px', borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 50 }}>ย้อนกลับ</button>
            <button onClick={submitAppeal} style={{ flex: 1, minWidth: 150, background: 'var(--primary)', color: '#fff', border: 'none', padding: 14, borderRadius: 11, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 50 }}>ส่งอุทธรณ์</button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div style={{ ...card, padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 46 }}>✅</div>
          <h2 style={{ fontSize: 22, margin: '12px 0 8px' }}>{doneMode === 'appeal' ? 'รับเรื่องอุทธรณ์แล้ว' : 'ยื่นคำร้องสำเร็จ'}</h2>
          <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 6px' }}>{doneMode === 'appeal' ? 'เจ้าหน้าที่จะตรวจสอบและติดต่อกลับ' : 'เจ้าหน้าที่จะพิจารณาตามระเบียบและแจ้งผลกลับ'}</p>
          <div style={{ fontSize: 14, color: '#52607A', marginBottom: 24 }}>หมายเลขคำร้อง: <b style={{ color: '#122A4A' }}>{ref}</b></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={resetAll} style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: '13px 24px', borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>ยื่นใหม่</button>
            <button onClick={() => navigate('/')} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '13px 24px', borderRadius: 11, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>กลับหน้าแรก</button>
          </div>
        </div>
      )}
    </main>
  );
}
