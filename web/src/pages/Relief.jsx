import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { genRef, scrollTop, stepBars } from '../lib/helpers';
import { insertReliefClaim, uploadReliefPhoto, notifyLine, analyzeDamage, geminiStatus } from '../lib/db';
import { notifyCard, row, SITE } from '../lib/flex';
import { ReliefIcon } from '../components/Icons';
import MapPicker from '../components/MapPicker';

// ====== ข้อมูลอ้างอิง ======
const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'อื่น ๆ'];
const BANKS = ['ธ.กรุงไทย', 'ธ.ออมสิน', 'ธ.ก.ส.', 'ธ.กรุงเทพ', 'ธ.กสิกรไทย', 'ธ.ไทยพาณิชย์', 'ธ.กรุงศรีอยุธยา', 'ธ.อิสลามแห่งประเทศไทย', 'อื่น ๆ'];

// ตำบลในแต่ละอำเภอของจังหวัดยะลา (cascading dropdown — ล็อกเฉพาะจังหวัดยะลา)
const YALA_ADMIN = {
  'เมืองยะลา': ['สะเตง', 'สะเตงนอก', 'บุดี', 'ยุโป', 'ท่าสาป', 'ลิดล', 'ยะลา', 'ตาเซะ', 'พร่อน', 'บันนังสาเรง', 'เปาะเส้ง', 'หน้าถ้ำ', 'ลำใหม่', 'ลำพะยา'],
  'เบตง': ['เบตง', 'ยะรม', 'ตาเนาะแมเราะ', 'อัยเยอร์เวง', 'ธารน้ำทิพย์'],
  'รามัน': ['กายูบอเกาะ', 'กาลอ', 'โกตาบารู', 'เกะรอ', 'จะกว๊ะ', 'ท่าธง', 'เนินงาม', 'บาลอ', 'ยะต๊ะ', 'วังพญา', 'อาซ่อง'],
  'ยะหา': ['ยะหา', 'ละแอ', 'ปะแต', 'บาโร๊ะ', 'ตาชี', 'บาโงยซิแน', 'กาตอง'],
  'บันนังสตา': ['บันนังสตา', 'บาเจาะ', 'ตลิ่งชัน', 'เขื่อนบางลาง', 'ถ้ำทะลุ', 'ตาเนาะปูเต๊ะ'],
  'ธารโต': ['ธารโต', 'บ้านแหร', 'แม่หวาด', 'คีรีเขต'],
  'กาบัง': ['กาบัง', 'บาละ'],
  'กรงปินัง': ['กรงปินัง', 'สะเอะ', 'ห้วยกระทิง', 'ปุโรง'],
};
const POSTAL_BY_DISTRICT = { 'เมืองยะลา': '95000', 'เบตง': '95110', 'รามัน': '95140', 'ยะหา': '95120', 'บันนังสตา': '95130', 'ธารโต': '95150', 'กาบัง': '95120', 'กรงปินัง': '95000' };

const RESIDENCY = [
  { k: 'owner', l: 'เจ้าของบ้าน (มีชื่อเป็นเจ้าบ้าน)' },
  { k: 'resident', l: 'ผู้อยู่อาศัย' },
  { k: 'renter', l: 'ผู้เช่า' },
];

// ระดับน้ำ → เกณฑ์จัดระดับความเสียหาย (ตามระเบียบ ปภ.)
const WATER_LEVELS = [
  { k: 'ระดับข้อเท้า', grade: '1' },
  { k: 'ระดับเข่า', grade: '2' },
  { k: 'ระดับเอว (~50ซม.-1ม.)', grade: '2' },
  { k: 'ท่วมมิดหัว', grade: '3' },
  { k: 'ท่วมถึงชั้นสอง', grade: '4' },
];
const DAMAGE_LIST = ['โครงสร้างบ้านเสียหาย', 'ทรัพย์สินภายใน/เครื่องใช้ไฟฟ้า', 'ยานพาหนะ', 'พื้นที่ทำกิน/เกษตรกรรม'];

// เกณฑ์ 4 ระดับ + วงเงิน + ลำดับความสำคัญ (สรุปจากตารางระเบียบ ปภ.)
const GRADE_INFO = {
  '1': { title: 'ระดับ 1 · เสียหายเล็กน้อย', c: '#0E8A5F', bg: 'rgba(14,138,95,.1)', pay: 'เยียวยาเหมาจ่าย 9,000 บาท', priority: 4, sub: 'น้ำท่วมบางส่วน โครงสร้างหลักไม่กระทบ' },
  '2': { title: 'ระดับ 2 · เสียหายปานกลาง', c: '#B36B00', bg: 'rgba(179,107,0,.1)', pay: 'เหมาจ่าย 9,000 บาท + ค่าซ่อมจริง 15,000–70,000 บาท (ต้องมีช่างยืนยัน)', priority: 3, sub: 'น้ำท่วมชั้นล่าง ทรัพย์สิน/เฟอร์นิเจอร์เสียหาย' },
  '3': { title: 'ระดับ 3 · เสียหายหนัก', c: '#C0362E', bg: 'rgba(192,54,46,.09)', pay: '9,000 บาท + ส่วนเพิ่ม · ค่าซ่อมตามราคากลาง เพดานไม่เกิน 49,500 บาท', priority: 2, sub: 'น้ำสูงเกิน 1.5 ม. หรือท่วมถึงชั้น 2 โครงสร้างมีรอยร้าว' },
  '4': { title: 'ระดับ 4 · เสียหายสิ้นเชิง', c: '#8B1A10', bg: 'rgba(139,26,16,.09)', pay: '9,000–20,000 บาท + ค่าสร้างใหม่/ซ่อมใหญ่ เพดานสูงสุด 49,500 บาท', priority: 1, sub: 'โครงสร้างหลักพังทลาย เสียหายเกิน 50%' },
};

// ====== สไตล์ ======
const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(22px,3vw,32px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const inputStyle = { width: '100%', padding: '13px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, color: '#122A4A', minHeight: 50, background: '#fff' };
const label = { display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 6 };
const primaryBtn = { width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16.5, cursor: 'pointer', minHeight: 50 };
const ghostBtn = { background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: '13px 20px', borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 50 };
const optBtn = (on) => ({ textAlign: 'left', cursor: 'pointer', padding: '13px 14px', borderRadius: 11, fontSize: 15, fontWeight: 600, minHeight: 50, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });
const pillBtn = (on) => ({ cursor: 'pointer', padding: '11px 15px', borderRadius: 100, fontSize: 14.5, fontWeight: 600, minHeight: 44, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });
const pickBtn = (busy) => ({ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', border: '1.5px solid var(--primary)', borderRadius: 10, background: '#fff', color: 'var(--primary)', fontWeight: 700, fontSize: 14.5, cursor: busy ? 'wait' : 'pointer', minHeight: 46 });

// ลำดับสเตปของฟอร์ม
const STEPS = ['identity', 'residency', 'location', 'payment', 'disaster', 'photos', 'review'];
const STEP_LABELS = ['ตัวตน', 'ที่พัก', 'ที่ตั้ง', 'รับเงิน', 'เหตุภัย', 'รูปภาพ', 'ตรวจสอบ'];

// ====== อัปโหลดรูปเป็นกลุ่ม (โชว์พรีวิวทันที แล้วอัปขึ้น Supabase Storage เบื้องหลัง) ======
function PhotoGroup({ title, hint, folder, urls, onAdd, onReplace, onRemove, max = 6 }) {
  const [status, setStatus] = useState('');   // ตัวเชคสถานะ/ข้อความ error
  const fileRef = useRef(null);
  const camRef = useRef(null);

  const onPick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';                       // เคลียร์ค่าเพื่อให้เปิด/เลือกซ้ำได้ทุกครั้ง
    if (!files.length) { setStatus('ยังไม่ได้เลือกรูป — กดปุ่มเพื่อเลือกใหม่ได้เลย'); return; }
    const chosen = files.slice(0, Math.max(0, max - urls.length));
    for (const file of chosen) {
      const localUrl = URL.createObjectURL(file);
      onAdd(localUrl);                          // โชว์รูปทันที (พรีวิวในเครื่อง)
      setStatus('กำลังอัปโหลด ' + (file.name || 'รูป') + '…');
      try {
        const remoteUrl = await uploadReliefPhoto(file, folder);
        if (remoteUrl) onReplace(localUrl, remoteUrl);   // แทนที่ด้วย URL จริงบนเซิร์ฟเวอร์
        setStatus('');
      } catch (err) {
        setStatus('⚠ อัปโหลดขึ้นเซิร์ฟเวอร์ไม่สำเร็จ: ' + (err?.message || 'ไม่ทราบสาเหตุ') + ' (รูปยังแสดงอยู่)');
      }
    }
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#122A4A', marginBottom: 3 }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, color: '#52607A', marginBottom: 10, lineHeight: 1.5 }}>{hint}</div>}
      {urls.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          {urls.map((u, i) => (
            <div key={u} style={{ position: 'relative', width: 92, height: 92, borderRadius: 11, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <img src={u} alt={`หลักฐาน ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={() => onRemove(i)} aria-label="ลบรูป" style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(18,42,74,.82)', color: '#fff', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
      {urls.length < max && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={pickBtn(false)}>📁 ใส่ภาพจากเครื่อง</button>
          <button type="button" onClick={() => camRef.current?.click()} style={pickBtn(false)}>📷 ถ่ายรูป</button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} style={{ display: 'none' }} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" multiple onChange={onPick} style={{ display: 'none' }} />
        </div>
      )}
      {status && <div style={{ fontSize: 12.5, color: status.startsWith('⚠') ? 'var(--danger)' : '#52607A', marginTop: 8, lineHeight: 1.5 }}>{status}</div>}
    </div>
  );
}

// อัปโหลดรูปเดี่ยว (เอกสาร เช่น บัตร ปชช. / ทะเบียนบ้าน / สัญญาเช่า)
function SinglePhoto({ url, onSet, folder }) {
  const [status, setStatus] = useState('');
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const onPick = async (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) { setStatus('ยังไม่ได้เลือกไฟล์ — กดปุ่มเพื่อเลือกใหม่ได้เลย'); return; }
    const localUrl = URL.createObjectURL(file);
    onSet(localUrl);                            // โชว์ทันที
    setStatus('กำลังอัปโหลด…');
    try {
      const remoteUrl = await uploadReliefPhoto(file, folder);
      if (remoteUrl) onSet(remoteUrl);
      setStatus('');
    } catch (err) {
      setStatus('⚠ อัปโหลดไม่สำเร็จ: ' + (err?.message || 'ไม่ทราบสาเหตุ') + ' (ไฟล์ยังแสดงอยู่)');
    }
  };
  return (
    <div>
      {url ? (
        <div style={{ position: 'relative', width: 120, height: 88, borderRadius: 11, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <img src={url} alt="เอกสาร" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button type="button" onClick={() => { onSet(''); setStatus(''); }} aria-label="ลบ" style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(18,42,74,.82)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>×</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={pickBtn(false)}>📁 ใส่ไฟล์</button>
          <button type="button" onClick={() => camRef.current?.click()} style={pickBtn(false)}>📷 ถ่ายรูป</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: 'none' }} />
        </div>
      )}
      {status && <div style={{ fontSize: 12.5, color: status.startsWith('⚠') ? 'var(--danger)' : '#52607A', marginTop: 8, lineHeight: 1.5 }}>{status}</div>}
    </div>
  );
}

const emptyForm = {
  idMethod: '', prefix: 'นาย', name: '', nationalId: '', dob: '', phone: '', photoIdCard: '',
  residency: '', photoHouseReg: '', photoRental: '',
  address: '', province: 'ยะลา', district: '', subdistrict: '', postalCode: '', lat: null, lng: null,
  paymentMethod: '', bankName: '', bankAccount: '',
  floodStart: '', floodEnd: '', daysFlooded: '', waterLevel: '', damageItems: [],
  photosDuring: [], photosAfter: [], photoCritical: '',
  declaration: false, pdpa: false,
};

// แปลเหตุผลที่ Gemini วิเคราะห์ไม่ได้ ให้เป็นภาษาไทยอ่านง่าย (ใช้กับตัวเชค)
const AI_REASON_TH = {
  no_key: 'ยังไม่ได้ตั้งค่าคีย์ Gemini (GEMINI_API_KEY) ในระบบ',
  no_images: 'ยังไม่มีรูปที่อัปขึ้นเซิร์ฟเวอร์',
  images_unreadable: 'อ่านไฟล์รูปไม่ได้',
  gemini_error: 'เรียก Gemini ไม่สำเร็จ',
  quota: 'โควตา Gemini เต็มชั่วคราว',
  parse_error: 'อ่านผลลัพธ์จาก AI ไม่ได้',
  server_error: 'เซิร์ฟเวอร์ขัดข้อง',
  network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้',
};

export default function Relief() {
  const navigate = useNavigate();
  const { showToast, profile, updateProfile } = useApp();

  const [stage, setStage] = useState('identity'); // identity..review | done | appeal
  const [f, setF] = useState(() => ({
    ...emptyForm,
    name: profile.name || '', nationalId: profile.nationalId || '', phone: profile.phone || '',
  }));
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoWarnAck, setPhotoWarnAck] = useState(false); // เตือนกฎหมายก่อนแนบภาพ

  const [grade, setGrade] = useState('');
  const [ref, setRef] = useState('');
  const [doneMode, setDoneMode] = useState('confirm'); // confirm | appeal
  const [appealText, setAppealText] = useState('');
  const [aiInfo, setAiInfo] = useState(null);          // ผลวิเคราะห์จาก Gemini
  const [ai, setAi] = useState(null);                  // สถานะ Gemini (มีคีย์ไหม) — ตัวเชค

  // เช็คสถานะ Gemini ตอนเปิดหน้า (โชว์ว่าระบบ AI พร้อมไหม)
  useEffect(() => { let alive = true; geminiStatus().then((s) => { if (alive) setAi(s); }); return () => { alive = false; }; }, []);

  const stepIdx = STEPS.indexOf(stage);
  const bars = stepBars(STEPS.length, stepIdx);

  // จำนวนวันน้ำท่วม (คำนวณอัตโนมัติจากช่วงวันที่ ถ้ากรอกครบ)
  const autoDays = useMemo(() => {
    if (!f.floodStart || !f.floodEnd) return '';
    const a = new Date(f.floodStart), b = new Date(f.floodEnd);
    const d = Math.round((b - a) / 86400000) + 1;
    return d >= 1 ? String(d) : '';
  }, [f.floodStart, f.floodEnd]);
  const daysValue = f.daysFlooded || autoDays;

  const go = (to) => { setErr(''); setStage(to); scrollTop(); };
  const next = () => go(STEPS[stepIdx + 1]);
  const back = () => (stepIdx > 0 ? go(STEPS[stepIdx - 1]) : navigate('/'));

  // ThaID (จำลอง) — เติมข้อมูลตัวอย่างให้อัตโนมัติ
  const runThaID = () => {
    set({ idMethod: 'thaid', prefix: 'นาย', name: f.name || 'สมชาย ใจดี', nationalId: f.nationalId || '1959900123456', dob: f.dob || '1985-06-15' });
    showToast('ยืนยันตัวตน ThaID สำเร็จ · ดึงข้อมูลทะเบียนราษฎรแล้ว');
  };

  const validateStep = () => {
    if (stage === 'identity') {
      if (!f.idMethod) return 'กรุณาเลือกวิธียืนยันตัวตน (ThaID หรือ กรอกเอง)';
      if (!f.prefix || !f.name.trim()) return 'กรุณากรอกคำนำหน้าและชื่อ-นามสกุล';
      if (f.nationalId.replace(/\D/g, '').length !== 13) return 'กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก';
      if (!f.dob) return 'กรุณาระบุวัน/เดือน/ปีเกิด';
      if (!/^0\d{9}$/.test(f.phone.trim())) return 'กรุณากรอกเบอร์โทร 10 หลักให้ถูกต้อง';
      if (f.idMethod === 'manual' && !f.photoIdCard) return 'ช่องทางกรอกเอง: กรุณาแนบรูปบัตรประชาชน';
      return '';
    }
    if (stage === 'residency') {
      if (!f.residency) return 'กรุณาเลือกสถานะผู้พักอาศัย';
      if (f.idMethod === 'manual' && !f.photoHouseReg) return 'กรุณาแนบรูปทะเบียนบ้าน (สำหรับช่องทางกรอกเอง)';
      if (f.residency === 'renter' && !f.photoRental) return 'ผู้เช่า: กรุณาแนบรูปสัญญาเช่าบ้าน';
      return '';
    }
    if (stage === 'location') {
      if (!f.address.trim()) return 'กรุณากรอกที่อยู่ตัวบ้าน';
      if (!f.district) return 'กรุณาเลือกอำเภอ';
      if (!f.subdistrict) return 'กรุณาเลือกตำบล';
      if (!f.lat || !f.lng) return 'กรุณาปักหมุดตำแหน่งบ้านบนแผนที่';
      return '';
    }
    if (stage === 'payment') {
      if (!f.paymentMethod) return 'กรุณาเลือกช่องทางรับเงิน';
      if (f.paymentMethod === 'bank' && (!f.bankName || !f.bankAccount.trim())) return 'กรุณากรอกธนาคารและเลขบัญชี';
      return '';
    }
    if (stage === 'disaster') {
      if (!f.floodStart) return 'กรุณาระบุวันที่เริ่มน้ำท่วม';
      if (!f.waterLevel) return 'กรุณาเลือกระดับน้ำสูงสุด';
      if (!(parseInt(daysValue, 10) >= 1)) return 'กรุณาระบุจำนวนวันน้ำท่วมขัง';
      return '';
    }
    if (stage === 'photos') {
      if (f.photosAfter.length < 1) return 'กรุณาแนบรูปหลังน้ำท่วม (สภาพความเสียหาย) อย่างน้อย 1 ภาพ';
      return '';
    }
    if (stage === 'review') {
      if (!f.declaration) return 'กรุณายอมรับคำรับรองความถูกต้องของข้อมูล';
      if (!f.pdpa) return 'กรุณายอมรับความยินยอมการใช้ข้อมูล (PDPA)';
      return '';
    }
    return '';
  };

  const onNext = () => {
    const e = validateStep();
    if (e) { setErr(e); return; }
    next();
  };

  const toggleDamage = (t) => set({ damageItems: f.damageItems.includes(t) ? f.damageItems.filter((x) => x !== t) : [...f.damageItems, t] });

  const gradeFromWater = () => (WATER_LEVELS.find((w) => w.k === f.waterLevel)?.grade) || '2';

  const saveProfile = () => updateProfile({ name: f.name.trim() || profile.name, phone: f.phone.trim() || profile.phone, nationalId: f.nationalId.replace(/\D/g, '') || profile.nationalId });

  const submitClaim = async () => {
    const e = validateStep();
    if (e) { setErr(e); return; }
    if (submitting) return;
    setSubmitting(true);
    setStage('analyzing'); scrollTop();

    // ส่งเฉพาะรูปที่อัปขึ้นเซิร์ฟเวอร์แล้ว (https) ให้ Gemini วิเคราะห์
    const imgs = [...f.photosAfter, ...(f.photoCritical ? [f.photoCritical] : []), ...f.photosDuring]
      .filter((u) => typeof u === 'string' && u.startsWith('http'));
    const result = await analyzeDamage({ images: imgs, water: f.waterLevel, days: parseInt(daysValue, 10) || null, damage: f.damageItems });
    const g = (result && result.ok && result.grade) ? result.grade : gradeFromWater();
    const newRef = genRef('RL', 6);

    await insertReliefClaim({
      ref: newRef, trackingId: newRef, mode: 'confirm', grade: g, water: f.waterLevel,
      prefix: f.prefix, name: f.name.trim(), nationalId: f.nationalId.replace(/\D/g, ''),
      idMethod: f.idMethod, dob: f.dob, phone: f.phone.trim(),
      residency: f.residency, address: f.address.trim(),
      province: 'ยะลา', district: f.district, subdistrict: f.subdistrict, postalCode: f.postalCode,
      lat: f.lat, lng: f.lng, paymentMethod: f.paymentMethod, bankName: f.bankName, bankAccount: f.bankAccount.trim(),
      floodStart: f.floodStart, floodEnd: f.floodEnd, daysFlooded: parseInt(daysValue, 10) || null,
      damageItems: f.damageItems, photosDuring: f.photosDuring, photosAfter: f.photosAfter,
      photoHouseReg: f.photoHouseReg, photoRental: f.photoRental, photoCritical: f.photoCritical,
      priority: result?.priority ?? GRADE_INFO[g].priority,
      aiGrade: result?.ok ? result.grade : null,
      aiResult: result || null,
      pdpaConsent: f.pdpa, declarationConsent: f.declaration,
    });
    saveProfile();
    notifyLine(f.phone.trim(), `💰 รับคำร้องเยียวยาแล้ว · เลขที่ ${newRef}`, notifyCard({
      accent: '#B36B00',
      badge: '💰 รับคำร้องเยียวยาแล้ว',
      bigLabel: 'เลขที่คำร้อง (Tracking ID)',
      bigValue: newRef,
      rows: [
        row('ระดับความเสียหาย', GRADE_INFO[g].title),
        row('สถานะ', 'รอเจ้าหน้าที่ตรวจสอบ', '#B36B00'),
        row('พื้นที่', `ต.${f.subdistrict} อ.${f.district}`),
      ],
      buttonLabel: 'ติดตามสถานะ',
      buttonUri: `${SITE}/relief?openExternalBrowser=1`,
    }));
    setSubmitting(false);
    setAiInfo(result); setGrade(g); setRef(newRef); setDoneMode('confirm'); setStage('done'); scrollTop();
    showToast('ยื่นคำร้องเรียบร้อย');
  };

  const submitAppeal = async () => {
    if (!appealText.trim()) { setErr('กรุณาระบุเหตุผลการอุทธรณ์'); return; }
    if (submitting) return;
    setSubmitting(true);
    const newRef = genRef('AP', 6);
    await insertReliefClaim({
      ref: newRef, trackingId: newRef, mode: 'appeal', grade, water: f.waterLevel,
      name: f.name.trim(), nationalId: f.nationalId.replace(/\D/g, ''), idMethod: f.idMethod, phone: f.phone.trim(),
      district: f.district, subdistrict: f.subdistrict, note: appealText.trim(),
    });
    notifyLine(f.phone.trim(), `📤 รับคำอุทธรณ์แล้ว · เลขที่ ${newRef}`, notifyCard({
      accent: '#5B54C9',
      badge: '📤 รับคำอุทธรณ์แล้ว',
      bigLabel: 'เลขที่อุทธรณ์',
      bigValue: newRef,
      rows: [row('สถานะ', 'รอพิจารณาอุทธรณ์', '#5B54C9')],
      buttonLabel: 'ติดตามสถานะ',
      buttonUri: `${SITE}/relief?openExternalBrowser=1`,
    }));
    setSubmitting(false);
    setRef(newRef); setDoneMode('appeal'); setStage('done'); scrollTop();
    showToast('ส่งอุทธรณ์เรียบร้อย');
  };

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ReliefIcon color="var(--amber)" size={24} />
        </span>
        <h1 style={{ fontSize: 'clamp(24px,3.6vw,32px)' }}>ระบบเงินเยียวยา</h1>
      </div>

      {stepIdx >= 0 && (
        <>
          <div style={{ display: 'flex', gap: 6, margin: '18px 0 6px' }}>{bars.map((s, i) => <div key={i} style={s} />)}</div>
          <div style={{ fontSize: 13, color: '#52607A', marginBottom: 20 }}>ขั้นที่ {stepIdx + 1}/{STEPS.length} · {STEP_LABELS[stepIdx]}</div>
        </>
      )}

      {/* ===== STEP 1: ยืนยันตัวตน + ข้อมูลส่วนบุคคล ===== */}
      {stage === 'identity' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>ยืนยันตัวตนผู้ยื่นคำร้อง</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 18px', lineHeight: 1.6 }}>เลือกยืนยันด้วย ThaID เพื่อดึงข้อมูลอัตโนมัติ หรือกรอกเองสำหรับผู้ที่ไม่มีแอป (จะขอแนบรูปบัตรประชาชนเพิ่ม)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 18 }}>
            <button onClick={runThaID} style={optBtn(f.idMethod === 'thaid')}>
              <span aria-hidden="true">{f.idMethod === 'thaid' ? '●' : '○'}</span> 🪪 ยืนยันด้วย ThaID (ดึงข้อมูลอัตโนมัติ)
            </button>
            <button onClick={() => set({ idMethod: 'manual' })} style={optBtn(f.idMethod === 'manual')}>
              <span aria-hidden="true">{f.idMethod === 'manual' ? '●' : '○'}</span> ✍️ กรอกข้อมูลเอง (Manual)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={label} htmlFor="rf-prefix">คำนำหน้า</label>
              <select id="rf-prefix" value={f.prefix} onChange={(e) => set({ prefix: e.target.value })} style={inputStyle}>
                {PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
              <label style={label} htmlFor="rf-name">ชื่อ-นามสกุล</label>
              <input id="rf-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="ชื่อ นามสกุล" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={label} htmlFor="rf-id">เลขบัตรประชาชน 13 หลัก</label>
              <input id="rf-id" type="tel" inputMode="numeric" maxLength={13} value={f.nationalId} onChange={(e) => set({ nationalId: e.target.value.replace(/\D/g, '') })} placeholder="x xxxx xxxxx xx x" style={{ ...inputStyle, letterSpacing: 1 }} />
            </div>
            <div>
              <label style={label} htmlFor="rf-dob">วัน/เดือน/ปีเกิด</label>
              <input id="rf-dob" type="date" value={f.dob} onChange={(e) => set({ dob: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={label} htmlFor="rf-phone">เบอร์โทรศัพท์ติดต่อ</label>
            <input id="rf-phone" type="tel" inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="เช่น 0812345678" style={inputStyle} />
          </div>

          {f.idMethod === 'manual' && (
            <div style={{ background: 'var(--bg-alt)', borderRadius: 11, padding: 14, marginBottom: 16 }}>
              <label style={label}>รูปบัตรประชาชน (บังคับสำหรับกรอกเอง)</label>
              <SinglePhoto url={f.photoIdCard} onSet={(u) => set({ photoIdCard: u })} folder="idcard" placeholder="ถ่าย/แนบรูปบัตร" />
            </div>
          )}
          {f.idMethod === 'thaid' && (
            <div style={{ background: 'var(--safe-soft)', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, color: 'var(--safe)', marginBottom: 16 }}>✓ ดึงข้อมูลจากทะเบียนราษฎรแล้ว — ตรวจสอบความถูกต้องและกดถัดไป</div>
          )}

          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={back} style={ghostBtn}>ยกเลิก</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {/* ===== STEP 2: สถานะที่พักอาศัย ===== */}
      {stage === 'residency' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 16 }}>สถานะการพักอาศัยและสิทธิ์</h2>
          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            {RESIDENCY.map((r) => <button key={r.k} onClick={() => set({ residency: r.k })} style={optBtn(f.residency === r.k)}><span aria-hidden="true">{f.residency === r.k ? '●' : '○'}</span> {r.l}</button>)}
          </div>

          <div style={{ background: 'var(--bg-alt)', borderRadius: 11, padding: 14, marginBottom: 14 }}>
            <label style={label}>รูปถ่ายทะเบียนบ้าน {f.idMethod === 'manual' ? '(บังคับ)' : '(แนะนำ — ยืนยันว่าเป็นบ้านในพื้นที่)'}</label>
            <SinglePhoto url={f.photoHouseReg} onSet={(u) => set({ photoHouseReg: u })} folder="housereg" placeholder="ถ่าย/แนบทะเบียนบ้าน" />
          </div>
          {f.residency === 'renter' && (
            <div style={{ background: 'var(--bg-alt)', borderRadius: 11, padding: 14, marginBottom: 14 }}>
              <label style={label}>รูปถ่ายสัญญาเช่าบ้าน (บังคับสำหรับผู้เช่า)</label>
              <SinglePhoto url={f.photoRental} onSet={(u) => set({ photoRental: u })} folder="rental" placeholder="ถ่าย/แนบสัญญาเช่า" />
            </div>
          )}

          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: ที่ตั้ง + ปักหมุดแผนที่ ===== */}
      {stage === 'location' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 16 }}>ที่ตั้งบ้านและการปักหมุด</h2>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="rf-addr">ที่อยู่ตัวบ้าน (บ้านเลขที่ หมู่/ชุมชน ตรอก/ซอย ถนน)</label>
            <input id="rf-addr" value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="เช่น 123 ถ.สิโรรส ชุมชนบ้านร่ม" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={label} htmlFor="rf-prov">จังหวัด</label>
              <input id="rf-prov" value="ยะลา" disabled style={{ ...inputStyle, background: '#F1F4F8', color: '#52607A' }} />
            </div>
            <div>
              <label style={label} htmlFor="rf-dist">อำเภอ</label>
              <select id="rf-dist" value={f.district} onChange={(e) => set({ district: e.target.value, subdistrict: '', postalCode: POSTAL_BY_DISTRICT[e.target.value] || '' })} style={inputStyle}>
                <option value="">เลือกอำเภอ</option>
                {Object.keys(YALA_ADMIN).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="rf-sub">ตำบล</label>
              <select id="rf-sub" value={f.subdistrict} onChange={(e) => set({ subdistrict: e.target.value })} disabled={!f.district} style={{ ...inputStyle, background: f.district ? '#fff' : '#F1F4F8' }}>
                <option value="">{f.district ? 'เลือกตำบล' : 'เลือกอำเภอก่อน'}</option>
                {(YALA_ADMIN[f.district] || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 18, maxWidth: 220 }}>
            <label style={label} htmlFor="rf-postal">รหัสไปรษณีย์</label>
            <input id="rf-postal" type="tel" inputMode="numeric" maxLength={5} value={f.postalCode} onChange={(e) => set({ postalCode: e.target.value.replace(/\D/g, '') })} placeholder="95000" style={inputStyle} />
          </div>

          <label style={label}>ปักหมุดตำแหน่งบ้านบนแผนที่</label>
          <div style={{ fontSize: 12.5, color: '#52607A', marginBottom: 10, lineHeight: 1.5 }}>ระบบเทียบพิกัดกับที่อยู่ทะเบียนบ้านเพื่อป้องกันการสวมสิทธิ์ · ลากหมุดปรับตำแหน่งได้</div>
          <MapPicker value={{ lat: f.lat, lng: f.lng }} onChange={({ lat, lng }) => set({ lat, lng })} />

          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: '12px 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {/* ===== STEP 4: ช่องทางรับเงิน ===== */}
      {stage === 'payment' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 16 }}>ช่องทางการรับเงินเยียวยา</h2>
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            <button onClick={() => set({ paymentMethod: 'promptpay' })} style={optBtn(f.paymentMethod === 'promptpay')}><span aria-hidden="true">{f.paymentMethod === 'promptpay' ? '●' : '○'}</span> พร้อมเพย์ผูกกับเลขบัตรประชาชน (แนะนำ)</button>
            <button onClick={() => set({ paymentMethod: 'bank' })} style={optBtn(f.paymentMethod === 'bank')}><span aria-hidden="true">{f.paymentMethod === 'bank' ? '●' : '○'}</span> โอนเข้าบัญชีธนาคาร</button>
          </div>

          {f.paymentMethod === 'promptpay' && (
            <div style={{ background: 'var(--safe-soft)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, color: '#33415A', marginBottom: 16, lineHeight: 1.6 }}>
              โอนเข้าพร้อมเพย์ที่ผูกกับเลขบัตร <b>{f.nationalId || '—'}</b> · ปลอดภัยและตรงตัวผู้ยื่นคำร้อง
            </div>
          )}
          {f.paymentMethod === 'bank' && (
            <>
              <div style={{ background: 'var(--danger-soft)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 14, lineHeight: 1.55 }}>
                ⚠ ชื่อบัญชีต้องตรงกับชื่อผู้ยื่นคำร้องเท่านั้น (ตามระเบียบ ปภ.)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={label} htmlFor="rf-bank">ธนาคาร</label>
                  <select id="rf-bank" value={f.bankName} onChange={(e) => set({ bankName: e.target.value })} style={inputStyle}>
                    <option value="">เลือกธนาคาร</option>
                    {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label} htmlFor="rf-acc">เลขที่บัญชี</label>
                  <input id="rf-acc" type="tel" inputMode="numeric" value={f.bankAccount} onChange={(e) => set({ bankAccount: e.target.value.replace(/\D/g, '') })} placeholder="เลขบัญชี" style={inputStyle} />
                </div>
              </div>
            </>
          )}

          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {/* ===== STEP 5: รายละเอียดภัย ===== */}
      {stage === 'disaster' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 16 }}>รายละเอียดเหตุภัยและความเสียหาย</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={label} htmlFor="rf-fs">วันที่เริ่มน้ำท่วม</label>
              <input id="rf-fs" type="date" value={f.floodStart} onChange={(e) => set({ floodStart: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={label} htmlFor="rf-fe">วันที่น้ำลด (ถ้ามี)</label>
              <input id="rf-fe" type="date" value={f.floodEnd} onChange={(e) => set({ floodEnd: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={label} htmlFor="rf-days">จำนวนวันน้ำท่วมขัง</label>
              <input id="rf-days" type="tel" inputMode="numeric" value={daysValue} onChange={(e) => set({ daysFlooded: e.target.value.replace(/\D/g, '') })} placeholder="อัตโนมัติ" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <span style={{ ...label }}>ระดับน้ำสูงสุด (ประมาณการ)</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              {WATER_LEVELS.map((w) => <button key={w.k} onClick={() => set({ waterLevel: w.k })} style={optBtn(f.waterLevel === w.k)}><span aria-hidden="true">{f.waterLevel === w.k ? '●' : '○'}</span> {w.k}</button>)}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <span style={{ ...label }}>รายการความเสียหายเบื้องต้น (เลือกได้หลายข้อ)</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {DAMAGE_LIST.map((t) => <button key={t} onClick={() => toggleDamage(t)} style={pillBtn(f.damageItems.includes(t))}><span aria-hidden="true">{f.damageItems.includes(t) ? '☑' : '☐'}</span> {t}</button>)}
            </div>
          </div>

          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {/* ===== STEP 6: อัปโหลดหลักฐาน (แยกช่วง/หลังน้ำท่วม) ===== */}
      {stage === 'photos' && (
        <div style={card}>
          {/* เตือนกฎหมายก่อนแนบภาพ — ต้องกดยอมรับก่อน */}
          {!photoWarnAck && (
            <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,18,32,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: '#fff', borderRadius: 18, maxWidth: 440, width: '100%', padding: 'clamp(22px,4vw,30px)', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
                <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 8 }}>⚠️</div>
                <h3 style={{ fontSize: 20, textAlign: 'center', marginBottom: 12, color: '#8B1A10' }}>ก่อนแนบภาพ · โปรดอ่าน</h3>
                <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#7A241C', lineHeight: 1.7, marginBottom: 16 }}>
                  ภาพที่แนบต้องเป็น <b>ภาพความเสียหายจริงของบ้านคุณ</b> เท่านั้น<br />
                  การส่งภาพเท็จ ภาพปลอม ภาพจากที่อื่น หรือให้ข้อมูลอันเป็นเท็จเพื่อรับเงินเยียวยา ถือเป็น <b>ความผิดอาญาฐานฉ้อโกงและแจ้งความเท็จต่อเจ้าพนักงาน</b> ต้องคืนเงินและรับโทษตามกฎหมาย
                </div>
                <div style={{ fontSize: 12.5, color: '#52607A', lineHeight: 1.6, marginBottom: 18 }}>ระบบตรวจสอบเวลา-พิกัด (metadata) และตรวจภาพซ้ำ (image hashing) อัตโนมัติ เพื่อป้องกันการสวมสิทธิ์</div>
                <button onClick={() => setPhotoWarnAck(true)} style={{ ...primaryBtn }}>เข้าใจแล้ว · ยืนยันจะแนบภาพจริง</button>
                <button onClick={back} style={{ width: '100%', background: 'none', border: 'none', color: '#8592A3', fontSize: 13.5, cursor: 'pointer', marginTop: 10 }}>ย้อนกลับ</button>
              </div>
            </div>
          )}
          <h2 style={{ fontSize: 21, marginBottom: 12 }}>รูปถ่ายหลักฐานความเสียหาย</h2>

          <div style={{ background: 'linear-gradient(180deg,#fff,#F4FBF8)', border: '1px solid var(--safe-soft)', borderRadius: 14, padding: '16px 18px', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>📸</span>
              <b style={{ color: '#122A4A', fontSize: 15.5 }}>คำแนะนำการถ่ายภาพให้ผ่านการตรวจ</b>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: '#41506B', lineHeight: 1.75 }}>
              <li><b>แสงสว่างเพียงพอ</b> — ถ่ายกลางวันหรือเปิดไฟให้เห็นรายละเอียดชัด ไม่ถ่ายย้อนแสงหรือในที่มืด</li>
              <li><b>เปิดตำแหน่ง (GPS)</b> ในกล้องก่อนถ่าย เพื่อฝังพิกัด-เวลาลงในรูป (ระบบใช้ตรวจสอบ)</li>
              <li><b>รูปหน้าบ้าน</b> — ให้เห็นโครงสร้างบ้าน + คราบรอยน้ำ + ป้ายบ้านเลขที่ ในเฟรมเดียวกัน</li>
              <li><b>รูปในบ้าน</b> — จุดที่น้ำท่วมถึง คราบโคลน เฟอร์นิเจอร์/เครื่องใช้ไฟฟ้าที่เสียหาย</li>
              <li><b>จุดวิกฤต</b> — ถ่ายมุมกว้างให้เห็นรอยร้าวลึกหรือการพังทลายของโครงสร้าง</li>
            </ul>
            <div style={{ marginTop: 10, fontSize: 12.5, color: '#33415A', display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--safe-soft)', borderRadius: 8, padding: '9px 12px', lineHeight: 1.55 }}>
              <span aria-hidden="true">🛡️</span>
              <span>มาตรการตรวจสอบ: ระบบอ่าน metadata เวลา-พิกัด และตรวจภาพซ้ำ (image hashing) อัตโนมัติ เพื่อป้องกันการใช้ภาพเก่าหรือภาพจากที่อื่นมาสวมสิทธิ์</span>
            </div>
          </div>

          <PhotoGroup
            title="📸 รูประหว่างน้ำท่วม (ไม่บังคับ)"
            hint="ถ้ามีภาพช่วงน้ำกำลังท่วม แนบได้เลย — ช่วยยืนยันระดับน้ำจริง ถ้าไม่มีข้ามได้"
            folder="during"
            urls={f.photosDuring}
            onAdd={(u) => setF((p) => ({ ...p, photosDuring: [...p.photosDuring, u] }))}
            onReplace={(o, n) => setF((p) => ({ ...p, photosDuring: p.photosDuring.map((x) => (x === o ? n : x)) }))}
            onRemove={(i) => setF((p) => ({ ...p, photosDuring: p.photosDuring.filter((_, x) => x !== i) }))}
          />

          <PhotoGroup
            title="🏠 รูปหลังน้ำท่วม / สภาพความเสียหาย (บังคับอย่างน้อย 1 ภาพ)"
            hint="ถ่ายหน้าบ้านให้เห็นคราบรอยน้ำ + ป้ายบ้านเลขที่ และภายในบ้านจุดที่เสียหาย"
            folder="after"
            urls={f.photosAfter}
            onAdd={(u) => setF((p) => ({ ...p, photosAfter: [...p.photosAfter, u] }))}
            onReplace={(o, n) => setF((p) => ({ ...p, photosAfter: p.photosAfter.map((x) => (x === o ? n : x)) }))}
            onRemove={(i) => setF((p) => ({ ...p, photosAfter: p.photosAfter.filter((_, x) => x !== i) }))}
          />

          <div style={{ background: 'var(--bg-alt)', borderRadius: 11, padding: 14, marginBottom: 4 }}>
            <label style={label}>รูปจุดที่เสียหายหนักที่สุด (ไม่บังคับ — สำหรับเคสโครงสร้างพัง)</label>
            <SinglePhoto url={f.photoCritical} onSet={(u) => set({ photoCritical: u })} folder="critical" placeholder="แนบรูปจุดวิกฤต" />
          </div>

          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: '12px 0' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={onNext} style={{ ...primaryBtn, flex: 1 }}>ถัดไป</button>
          </div>
        </div>
      )}

      {/* ===== STEP 7: ตรวจสอบ + คำรับรอง ===== */}
      {stage === 'review' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 16 }}>ตรวจสอบข้อมูลก่อนส่งคำร้อง</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 18 }}>
            <ReviewRow k="ผู้ยื่นคำร้อง" v={`${f.prefix} ${f.name} · ${f.nationalId}`} />
            <ReviewRow k="ยืนยันตัวตน" v={f.idMethod === 'thaid' ? 'ThaID' : 'กรอกเอง + แนบบัตร'} />
            <ReviewRow k="สถานะที่พัก" v={RESIDENCY.find((r) => r.k === f.residency)?.l} />
            <ReviewRow k="ที่ตั้ง" v={`${f.address} · ต.${f.subdistrict} อ.${f.district} จ.ยะลา ${f.postalCode}`} />
            <ReviewRow k="พิกัดปักหมุด" v={f.lat ? `${f.lat}, ${f.lng}` : '—'} />
            <ReviewRow k="ช่องทางรับเงิน" v={f.paymentMethod === 'promptpay' ? 'พร้อมเพย์ (เลขบัตร)' : `${f.bankName} ${f.bankAccount}`} />
            <ReviewRow k="เหตุน้ำท่วม" v={`${f.floodStart}${f.floodEnd ? ' ถึง ' + f.floodEnd : ''} · ${daysValue} วัน · ${f.waterLevel}`} />
            <ReviewRow k="ความเสียหาย" v={f.damageItems.length ? f.damageItems.join(', ') : '—'} />
            <ReviewRow k="รูปหลักฐาน" v={`ระหว่างน้ำท่วม ${f.photosDuring.length} · หลังน้ำท่วม ${f.photosAfter.length}${f.photoCritical ? ' · จุดวิกฤต 1' : ''}`} />
          </div>

          {/* ตัวเชคสถานะ Gemini — บอกว่าจะวิเคราะห์ภาพด้วย AI หรือใช้เกณฑ์ระดับน้ำ */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderRadius: 11, padding: 13, marginBottom: 16, background: ai?.hasKey ? '#F1F6FF' : 'var(--bg-alt)', border: `1px solid ${ai?.hasKey ? '#C9D9F5' : 'var(--line)'}` }}>
            <span style={{ fontSize: 18 }}>{ai?.hasKey ? '🔷' : '⚙️'}</span>
            <div style={{ fontSize: 13, color: '#33415A', lineHeight: 1.55 }}>
              {ai == null ? 'กำลังตรวจสอบระบบ AI…'
                : ai.hasKey
                  ? <>ระบบ AI <b>Gemini พร้อมวิเคราะห์ภาพ</b> — เมื่อกดส่ง จะวิเคราะห์รูปตามเกณฑ์ ปภ. แล้วเสนอระดับความเสียหาย (เจ้าหน้าที่อนุมัติขั้นสุดท้าย)</>
                  : <>ยังไม่ได้ตั้งค่าคีย์ Gemini — ระบบจะ<b>ประเมินจากระดับน้ำแทน</b>ไปก่อน (ใส่ GEMINI_API_KEY ใน Vercel เพื่อเปิดใช้วิเคราะห์ภาพจริง)</>}
            </div>
          </div>

          <label htmlFor="rf-dec" style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 12, cursor: 'pointer', fontSize: 13.5, color: '#3A485F', lineHeight: 1.55, background: 'var(--amber-soft)', borderRadius: 11, padding: 14 }}>
            <input id="rf-dec" type="checkbox" checked={f.declaration} onChange={(e) => set({ declaration: e.target.checked })} style={{ width: 20, height: 20, marginTop: 1, flex: 'none', accentColor: 'var(--primary)' }} />
            <span>ข้าพเจ้าขอรับรองว่าข้อมูลและรูปภาพที่ส่งมาเป็นความจริงทุกประการ หากตรวจสอบพบว่าเป็นเท็จ ข้าพเจ้ายินยอมคืนเงินช่วยเหลือและรับโทษทางอาญาตามกฎหมาย</span>
          </label>
          <label htmlFor="rf-pdpa" style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 16, cursor: 'pointer', fontSize: 13.5, color: '#3A485F', lineHeight: 1.55, background: 'var(--primary-soft)', borderRadius: 11, padding: 14 }}>
            <input id="rf-pdpa" type="checkbox" checked={f.pdpa} onChange={(e) => set({ pdpa: e.target.checked })} style={{ width: 20, height: 20, marginTop: 1, flex: 'none', accentColor: 'var(--primary)' }} />
            <span>ข้าพเจ้ายินยอมให้เทศบาลนครยะลาเก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคล รูปภาพ และพิกัด เพื่อพิจารณาการเยียวยา ตามนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
          </label>

          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={back} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={submitClaim} disabled={submitting} style={{ ...primaryBtn, flex: 1, background: submitting ? '#9FB2C9' : 'var(--primary)', cursor: submitting ? 'wait' : 'pointer' }}>{submitting ? 'กำลังส่ง…' : 'ส่งคำร้องเยียวยา'}</button>
          </div>
        </div>
      )}

      {/* ===== ANALYZING: กำลังวิเคราะห์ภาพด้วย Gemini ===== */}
      {stage === 'analyzing' && (
        <div style={{ ...card, textAlign: 'center', padding: '48px 28px' }}>
          <div aria-hidden="true" style={{ width: 54, height: 54, margin: '0 auto 18px', border: '4px solid #C9D9F5', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 17, fontWeight: 700, color: '#122A4A', marginBottom: 6 }}>{ai?.hasKey ? '🔷 กำลังวิเคราะห์ภาพด้วย Gemini…' : 'กำลังประมวลผลคำร้อง…'}</div>
          <div style={{ fontSize: 13.5, color: '#52607A', lineHeight: 1.6 }}>{ai?.hasKey ? 'AI กำลังตรวจรูปความเสียหายตามเกณฑ์ ปภ. อาจใช้เวลาสักครู่' : 'กำลังจัดระดับความเสียหายและออกเลขคำร้อง'}</div>
        </div>
      )}

      {/* ===== DONE: ผลประเมิน + Tracking ===== */}
      {stage === 'done' && (
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 46 }}>✅</div>
          <h2 style={{ fontSize: 22, margin: '10px 0 6px' }}>{doneMode === 'appeal' ? 'รับเรื่องอุทธรณ์แล้ว' : 'ยื่นคำร้องสำเร็จ'}</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 6px' }}>สถานะ: ยื่นคำร้องแล้ว — รอเจ้าหน้าที่ตรวจสอบเอกสาร</p>
          <div style={{ fontSize: 14, color: '#52607A', marginBottom: 18 }}>เลขที่คำร้อง (Tracking ID): <b style={{ color: '#122A4A' }}>{ref}</b></div>

          {doneMode === 'confirm' && (
            <div style={{ background: 'var(--safe-soft)', border: '1px solid var(--safe)', borderRadius: 12, padding: 16, marginBottom: 14, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: '#0E6B4A', fontSize: 15.5, marginBottom: 6 }}>✅ ส่งคำร้องและรูปหลักฐานเรียบร้อย</div>
              <div style={{ fontSize: 13.5, color: '#33415A', lineHeight: 1.65 }}>
                เจ้าหน้าที่เทศบาลกำลังตรวจสอบความเสียหายของบ้านคุณ เมื่อพิจารณาอนุมัติแล้ว เงินเยียวยาจะโอนตรงเข้าพร้อมเพย์ที่ผูกไว้ และแจ้งเตือนผ่าน LINE — ระบบจะแจ้งผลให้ทราบทุกขั้นตอน ไม่ต้องเดินทางมาที่เทศบาล
              </div>
            </div>
          )}
          <div style={{ background: '#F4F6F9', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#52607A', marginBottom: 18, lineHeight: 1.6 }}>
            บันทึกเลข Tracking ID ไว้ตรวจสอบสถานะได้ตลอด 24 ชม.: ยื่นคำร้องแล้ว → ตรวจสอบเอกสาร → ช่างลงพื้นที่ → อนุมัติจ่ายเงิน → โอนเงินสำเร็จ
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => { setF({ ...emptyForm }); setStage('identity'); scrollTop(); }} style={ghostBtn}>ยื่นคำร้องใหม่</button>
            <button onClick={() => navigate('/')} style={{ ...primaryBtn, width: 'auto', padding: '13px 24px' }}>กลับหน้าแรก</button>
          </div>
        </div>
      )}

      {/* ===== APPEAL ===== */}
      {stage === 'appeal' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 8 }}>ยื่นอุทธรณ์ผลการประเมิน</h2>
          <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 18px' }}>อธิบายเหตุผลที่ขอทบทวน เจ้าหน้าที่จะพิจารณาใหม่และติดต่อกลับ</p>
          <label style={label} htmlFor="rf-appeal">เหตุผลการอุทธรณ์</label>
          <textarea id="rf-appeal" rows={4} value={appealText} onChange={(e) => setAppealText(e.target.value)} placeholder="เช่น ความเสียหายมากกว่าที่ประเมิน มีทรัพย์สินอื่นเพิ่มเติม" style={{ ...inputStyle, resize: 'vertical', marginBottom: 14 }} />
          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setErr(''); setStage('done'); scrollTop(); }} style={ghostBtn}>ย้อนกลับ</button>
            <button onClick={submitAppeal} disabled={submitting} style={{ ...primaryBtn, flex: 1, background: submitting ? '#9FB2C9' : 'var(--primary)' }}>{submitting ? 'กำลังส่ง…' : 'ส่งอุทธรณ์'}</button>
          </div>
        </div>
      )}
    </main>
  );
}

function ReviewRow({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
      <span style={{ color: '#8592A3', flex: '0 0 130px' }}>{k}</span>
      <span style={{ color: '#122A4A', fontWeight: 600, minWidth: 0, wordBreak: 'break-word' }}>{v || '—'}</span>
    </div>
  );
}
