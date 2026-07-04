import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PHONE_RE, genRef, scrollTop } from '../lib/helpers';
import { ShareIcon } from '../components/Icons';
import { fetchJobs, insertJob, insertJobApplication, insertJobReport, insertJobRating, insertShareRequest, lineLoginUrl, notifyLine } from '../lib/db';

const TAB_DEFS = [{ k: 'all', l: 'ทั้งหมด' }, { k: 'need', l: 'ต้องการ' }, { k: 'give', l: 'แบ่งปัน' }, { k: 'job', l: 'จ้างงาน/รับงาน' }];
const NEW_TYPES = [{ k: 'need', l: 'ขอ/ต้องการ' }, { k: 'give', l: 'มี/แบ่งปัน' }, { k: 'gig', l: 'หาอาสา' }];

const REPORT_REASONS = ['งานหลอกลวง/ไม่มีจริง', 'พฤติกรรมน่าสงสัย (อาจแฝงเข้าพื้นที่)', 'นัดแล้วไม่มา/ผิดนัด', 'ข้อมูลติดต่อใช้ไม่ได้', 'อื่น ๆ'];
const RATE_TAGS = ['ตรงต่อเวลา', 'สุภาพ ปลอดภัย', 'ทำงานดี', 'น่าเชื่อถือ'];

// งานตัวอย่าง (เดโม) — ในสถานการณ์น้ำท่วมยะลา
const SEED_JOBS = [
  { id: 'j1', title: 'ยกของขึ้นที่สูง 2 ชั้น', pay: 'ค่าแรง 400 บ./วัน', zone: 'ต.สะเตง', note: 'บ้านริมคลอง น้ำกำลังขึ้น ต้องการด่วนบ่ายนี้', need: 3, applied: 1, poster: 'ร้านวัสดุบ้านรมย์', rating: 4.9, jobs: 34, verified: true, urgent: true },
  { id: 'j2', title: 'พายเรือส่งอาหารผู้สูงอายุ', pay: 'อาสา + ค่าน้ำมัน 200 บ.', zone: 'ต.ท่าสาป', note: 'เส้นทางในซอยน้ำท่วมสูง มีผู้สูงอายุติดบ้าน 6 หลัง', need: 4, applied: 2, poster: 'ครัวกลางชุมชน', rating: 4.8, jobs: 27, verified: true, urgent: false },
  { id: 'j3', title: 'ทำความสะอาดบ้านหลังน้ำลด', pay: 'ค่าจ้าง 500 บ.', zone: 'ต.บุดี', note: 'ล้างโคลน ขนของเสียหายออก', need: 2, applied: 2, poster: 'คุณสมชาย ก.', rating: 4.7, jobs: 12, verified: true, urgent: false },
  { id: 'j4', title: 'ขับรถกระบะขนถุงยังชีพ', pay: 'ค่าน้ำมัน + 350 บ.', zone: 'ต.ยุโป', note: 'ต้องมีรถกระบะ ขนของจากจุดรวมไปแจก 20 ครัวเรือน', need: 2, applied: 0, poster: 'อบต.ยุโป', rating: 5.0, jobs: 41, verified: true, urgent: true },
  { id: 'j5', title: 'ดูแลเด็กเล็กที่ศูนย์พักพิง', pay: 'อาสา', zone: 'ต.สะเตงนอก', note: 'ช่วยดูเด็ก 10-15 คน ช่วงพ่อแม่ไปเคลียร์บ้าน', need: 5, applied: 3, poster: 'ศูนย์พักพิงเทศบาล', rating: 4.9, jobs: 58, verified: true, urgent: false },
];

// งานที่ (จำลองว่า) ทำเสร็จแล้ว รอผู้รับงานให้คะแนนผู้ว่าจ้าง
const SEED_DONE = { id: 'd1', title: 'ยกกระสอบทรายกันน้ำ', poster: 'ร้านวัสดุบ้านรมย์', zone: 'ต.สะเตง' };

function badgeFor(type) {
  if (type === 'need') return { text: 'ต้องการ', bg: 'rgba(179,107,0,.12)', color: '#B36B00' };
  if (type === 'give') return { text: 'แบ่งปัน', bg: 'rgba(14,138,95,.12)', color: '#0E8A5F' };
  return { text: 'อาสา', bg: 'var(--primary-soft)', color: 'var(--primary)' };
}
function btnLabelFor(type) {
  if (type === 'give') return 'ขอรับสิ่งของ';
  if (type === 'gig') return 'สมัครอาสา';
  return 'แจ้งว่ามีให้';
}

// ---- localStorage: กันสมัครซ้ำ + ประวัติความน่าเชื่อถือของผู้ใช้ ----
function readApplied() {
  try { return JSON.parse(localStorage.getItem('yh_job_applied') || '[]'); } catch { return []; }
}
function markApplied(id) {
  try {
    const arr = readApplied();
    if (!arr.includes(id)) { arr.push(id); localStorage.setItem('yh_job_applied', JSON.stringify(arr)); }
  } catch { /* noop */ }
}
function readTrust() {
  try { return JSON.parse(localStorage.getItem('yh_trust') || 'null'); } catch { return null; }
}
function bumpTrust() {
  try {
    const t = readTrust() || { jobs: 0, rating: null };
    t.jobs += 1;
    if (t.rating == null) t.rating = 5.0;
    localStorage.setItem('yh_trust', JSON.stringify(t));
    return t;
  } catch { return { jobs: 1, rating: 5.0 }; }
}

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(22px,3vw,30px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, color: '#122A4A', minHeight: 48 };
const label = { display: 'block', fontSize: 14, fontWeight: 600, color: '#33415A', marginBottom: 6 };
const tabBtn = (on) => ({ cursor: 'pointer', padding: '10px 18px', borderRadius: 100, fontSize: 14.5, fontWeight: 600, minHeight: 44, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary)' : '#fff', color: on ? '#fff' : '#33415A' });
const optBtn = (on) => ({ cursor: 'pointer', padding: '11px 16px', borderRadius: 11, fontSize: 14.5, fontWeight: 600, minHeight: 46, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });
const primaryBtn = { width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: 'pointer', minHeight: 50 };

const emptyRequestForm = { name: '', phone: '', qty: '', note: '', err: '' };
const emptyNewForm = { type: 'need', name: '', qty: '', zone: '', note: '', err: '' };
const emptyJobForm = { title: '', pay: '', zone: '', note: '', need: '1', poster: '', phone: '', urgent: false, err: '' };

// วงกลมย่อชื่อผู้โพสต์
function Avatar({ name, size = 34 }) {
  const ch = (name || '?').trim().charAt(0);
  const colors = ['#0E8390', '#0E8A5F', '#B36B00', '#5B54C9', '#C2456B'];
  const bg = colors[(name || '').length % colors.length];
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.42, flex: '0 0 auto', fontFamily: "'IBM Plex Sans Thai'" }}>{ch}</span>
  );
}

// แถวความน่าเชื่อถือ: ยืนยันตัวตน + ดาว + จำนวนงาน
function TrustRow({ name, rating, jobs, verified }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
      <Avatar name={name} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#122A4A', fontSize: 14.5 }}>{name}</span>
          {verified && <span className="yh-verify" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--safe-soft)', color: 'var(--safe)', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>🛡️ ยืนยัน ThaID</span>}
        </div>
        <div style={{ fontSize: 12.5, color: '#52607A', marginTop: 1 }}>
          {jobs > 0 ? <>⭐ {rating?.toFixed(1)} · ทำงานสำเร็จ {jobs} งาน</> : <span style={{ color: '#B36B00' }}>ผู้ใช้ใหม่ · ยังไม่มีประวัติ</span>}
        </div>
      </div>
    </div>
  );
}

export default function Share() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { donations, addDonation, showToast } = useApp();
  const [posterPhone, setPosterPhone] = useState('');

  useEffect(() => {
    const line = searchParams.get('line');
    if (!line) return;
    showToast(line === 'connected' ? 'เชื่อมต่อ LINE สำเร็จ! พร้อมรับแจ้งเตือนแล้ว' : 'เชื่อมต่อ LINE ไม่สำเร็จ ลองใหม่อีกครั้ง');
    searchParams.delete('line');
    setSearchParams(searchParams, { replace: true });
  }, []);

  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');
  const [sel, setSel] = useState(null);
  const [reqForm, setReqForm] = useState(emptyRequestForm);
  const [submitting, setSubmitting] = useState(false);
  const [newForm, setNewForm] = useState(emptyNewForm);
  const [ref, setRef] = useState('');
  const [doneMode, setDoneMode] = useState('request');

  // ---- ระบบจ้างงาน/รับงาน ----
  const [jobs, setJobs] = useState(SEED_JOBS);
  useEffect(() => {
    let alive = true;
    fetchJobs().then((rows) => { if (alive && rows && rows.length) setJobs(rows); });
    return () => { alive = false; };
  }, []);
  const [selJob, setSelJob] = useState(null);
  const [applyStage, setApplyStage] = useState('verify'); // verify | confirm
  const [applyForm, setApplyForm] = useState({ name: '', nationalId: '', phone: '', idMethod: 'form', verified: false, verifying: false, err: '' });
  const [reportJob, setReportJob] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [doneRated, setDoneRated] = useState(false); // งานตัวอย่างถูกให้คะแนนแล้วหรือยัง
  const [rateStars, setRateStars] = useState(0);
  const [rateTags, setRateTags] = useState([]);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [postedPhone, setPostedPhone] = useState(''); // เบอร์ที่เพิ่งลงประกาศ (ไว้ชวนเชื่อม LINE)

  const openDetail = (id) => {
    const it = donations.find((d) => d.id === id);
    setSel(it); setReqForm(emptyRequestForm); setView('detail'); scrollTop();
  };
  const backToList = () => { setView('list'); scrollTop(); };
  const openNew = () => { setNewForm(emptyNewForm); setView('new'); scrollTop(); };

  const submitRequest = () => {
    if (submitting) return;
    if (!reqForm.name.trim() || !PHONE_RE.test(reqForm.phone.trim())) {
      setReqForm((f) => ({ ...f, err: 'กรุณากรอกชื่อ และเบอร์โทร 10 หลักให้ถูกต้อง' })); return;
    }
    setSubmitting(true);
    setReqForm((f) => ({ ...f, err: '' }));
    const newRef = genRef('SH', 5);
    // บันทึกจริงลง Supabase แบบ fire-and-forget (ไม่บล็อก UI ถ้าเน็ตช้า)
    insertShareRequest({
      itemName: sel?.name,
      type: sel?.type,
      name: reqForm.name.trim(),
      phone: reqForm.phone.trim(),
      qty: reqForm.qty.trim(),
      note: reqForm.note.trim(),
    });
    setTimeout(() => {
      setSubmitting(false);
      setRef(newRef);
      setDoneMode(sel?.type === 'give' ? 'request' : sel?.type === 'gig' ? 'gig' : 'offer');
      setView('done');
      scrollTop();
    }, 500);
  };

  const submitNew = () => {
    if (!newForm.name.trim()) { setNewForm((f) => ({ ...f, err: 'กรุณากรอกชื่อสิ่งของหรืองาน' })); return; }
    const item = { type: newForm.type, name: newForm.name, qty: newForm.qty || '-', zone: newForm.zone || 'ไม่ระบุพื้นที่', note: newForm.note || 'ประกาศใหม่' };
    addDonation(item);
    setView('list'); setTab('all'); scrollTop();
    showToast('เผยแพร่ประกาศเรียบร้อยแล้ว');
  };

  // ---- จ้างงาน: เปิดรายละเอียด / สมัคร ----
  const openJob = (job) => { setSelJob(job); setView('jobDetail'); scrollTop(); };
  const startApply = (job) => {
    setSelJob(job);
    setApplyStage('verify');
    setApplyForm({ name: '', nationalId: '', phone: '', idMethod: 'form', verified: false, verifying: false, err: '' });
    setView('jobApply'); scrollTop();
  };
  // ThaID = ทางเลือกยืนยันแบบเร็ว (จำลอง) — เติมสถานะยืนยันให้เลย
  const runThaID = () => {
    setApplyForm((f) => ({ ...f, verifying: true, err: '' }));
    setTimeout(() => setApplyForm((f) => ({ ...f, verifying: false, verified: true, idMethod: 'thaid' })), 1100);
  };
  const goConfirm = () => {
    // ต้องยืนยันตัวตนด้วยวิธีใดวิธีหนึ่ง: กรอกฟอร์ม (ชื่อ+เลขบัตร 13 หลัก) หรือ ThaID
    if (applyForm.idMethod === 'thaid') {
      if (!applyForm.verified) { setApplyForm((f) => ({ ...f, err: 'กรุณากด "เข้าสู่ระบบด้วย ThaID" ให้สำเร็จก่อน' })); return; }
    } else {
      if (!applyForm.name.trim()) { setApplyForm((f) => ({ ...f, err: 'กรุณากรอกชื่อ-นามสกุล' })); return; }
      if (applyForm.nationalId.replace(/\D/g, '').length !== 13) { setApplyForm((f) => ({ ...f, err: 'กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก' })); return; }
    }
    if (!PHONE_RE.test(applyForm.phone.trim())) { setApplyForm((f) => ({ ...f, err: 'กรอกเบอร์โทร 10 หลักให้ถูกต้อง' })); return; }
    if (readApplied().includes(selJob.id)) { setApplyForm((f) => ({ ...f, err: 'คุณสมัครงานนี้ไปแล้ว (1 คน สมัครได้ครั้งเดียว)' })); return; }
    setApplyForm((f) => ({ ...f, err: '', verified: true }));
    setApplyStage('confirm'); scrollTop();
  };
  const confirmApply = () => {
    markApplied(selJob.id);
    bumpTrust();
    setJobs((list) => list.map((j) => (j.id === selJob.id ? { ...j, applied: Math.min(j.applied + 1, j.need) } : j)));
    insertJobApplication(selJob.id, applyForm.phone.trim(), {
      fullName: applyForm.name.trim() || null,
      nationalId: applyForm.nationalId.replace(/\D/g, '') || null,
      idMethod: applyForm.idMethod,
    });
    if (selJob.posterPhone) {
      const maskedPhone = applyForm.phone.trim().replace(/^(\d{3})\d{4}(\d{3})$/, '$1-xxxx-$2');
      const who = applyForm.name.trim() ? applyForm.name.trim() : maskedPhone;
      notifyLine(selJob.posterPhone, `🟢 มีคนกดรับงาน "${selJob.title}" แล้ว!\nผู้สมัคร: ${who} (${maskedPhone}) · ยืนยันตัวตนแล้ว\nดูรายละเอียดที่เว็บ Yala Heal`);
    }
    setRef(genRef('JOB', 5));
    setView('jobDone'); scrollTop();
  };

  // ---- ลงประกาศงานจ้าง ----
  const openJobNew = () => { setJobForm(emptyJobForm); setView('jobNew'); scrollTop(); };
  const submitJob = async () => {
    if (submitting) return;
    const need = parseInt(jobForm.need, 10);
    if (!jobForm.title.trim()) { setJobForm((f) => ({ ...f, err: 'กรุณากรอกชื่องาน' })); return; }
    if (!jobForm.poster.trim()) { setJobForm((f) => ({ ...f, err: 'กรุณากรอกชื่อผู้ว่าจ้าง' })); return; }
    if (!PHONE_RE.test(jobForm.phone.trim())) { setJobForm((f) => ({ ...f, err: 'กรอกเบอร์โทร 10 หลักให้ถูกต้อง (ไว้รับแจ้งเตือน)' })); return; }
    if (!(need >= 1)) { setJobForm((f) => ({ ...f, err: 'จำนวนคนที่รับต้องอย่างน้อย 1' })); return; }
    setSubmitting(true);
    setJobForm((f) => ({ ...f, err: '' }));
    const payload = {
      title: jobForm.title.trim(),
      pay: jobForm.pay.trim() || 'ตามตกลง',
      zone: jobForm.zone.trim() || 'ไม่ระบุพื้นที่',
      note: jobForm.note.trim() || '-',
      need,
      poster: jobForm.poster.trim(),
      posterPhone: jobForm.phone.trim(),
      urgent: jobForm.urgent,
    };
    const saved = await insertJob(payload);
    const newJob = saved || { ...payload, id: `local-${Date.now()}`, applied: 0, rating: 5.0, jobs: 0, verified: true };
    setJobs((list) => [newJob, ...list]);
    setSubmitting(false);
    setPostedPhone(jobForm.phone.trim());
    setTab('job');
    setView('jobPosted'); scrollTop();
  };

  // ---- รายงานปัญหา ----
  const submitReport = () => {
    if (!reportReason) return;
    insertJobReport(reportJob.id, reportReason);
    setReportJob(null); setReportReason('');
    showToast('รับเรื่องแล้ว · ทีมเทศบาลตรวจสอบภายใน 24 ชม.');
  };

  // ---- ให้คะแนน ----
  const submitRate = () => {
    if (rateStars < 1) return;
    insertJobRating(SEED_DONE.id, rateStars, rateTags);
    setDoneRated(true);
    setRateStars(0); setRateTags([]);
    setView('list'); scrollTop();
    showToast('ขอบคุณ! บันทึกคะแนนแล้ว ช่วยสร้างชุมชนที่น่าเชื่อถือ');
  };

  const filtered = donations.filter((d) => tab === 'all' || d.type === tab);
  const selBadge = sel ? badgeFor(sel.type) : { text: '', bg: '', color: '' };
  const shareFormTitle = sel ? (sel.type === 'give' ? 'กรอกข้อมูลเพื่อขอรับ' : sel.type === 'gig' ? 'กรอกข้อมูลเพื่อสมัครอาสา' : 'กรอกข้อมูลเพื่อแจ้งว่ามีให้') : '';
  const shareSubmitLabel = sel ? (sel.type === 'give' ? 'ยืนยันขอรับ (ตรวจสอบโควตา ThaID)' : sel.type === 'gig' ? 'ยืนยันสมัครอาสา' : 'ยืนยันการแจ้ง') : 'ยืนยัน';
  const shareDoneMsg = doneMode === 'request' ? 'บันทึกคำขอรับเรียบร้อย ระบบตรวจสอบโควตา ThaID และจับคู่ผู้ให้แล้ว' : doneMode === 'gig' ? 'สมัครอาสาเรียบร้อย ผู้ประสานงานจะติดต่อกลับ' : 'บันทึกข้อมูลเรียบร้อย ขอบคุณสำหรับน้ำใจแบ่งปัน';
  const myTrust = readTrust();

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShareIcon color="var(--primary)" size={24} />
          </span>
          <h1 style={{ fontSize: 'clamp(22px,3.4vw,30px)' }}>ศูนย์แบ่งปัน &amp; จ้างงานชุมชน</h1>
        </div>
        {view === 'list' && <button onClick={openNew} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: 'pointer', minHeight: 46 }}>+ ลงประกาศใหม่</button>}
      </div>

      {view === 'list' && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 20px' }}>
            {TAB_DEFS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} style={tabBtn(tab === t.k)}>{t.l}</button>)}
          </div>

          {tab !== 'job' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                {filtered.map((d) => {
                  const b = badgeFor(d.type);
                  return (
                    <div key={d.id} className="yh-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(16,24,40,.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 100, background: b.bg, color: b.color }}>{b.text}</span>
                      <div style={{ fontWeight: 700, fontSize: 17, color: '#122A4A' }}>{d.name}</div>
                      <div style={{ fontSize: 14, color: '#122A4A', fontWeight: 600 }}>{d.qty}</div>
                      <div style={{ fontSize: 13.5, color: '#52607A' }}>📍 {d.zone} · {d.note}</div>
                      <button onClick={() => openDetail(d.id)} style={{ marginTop: 6, background: 'var(--primary)', color: '#fff', border: 'none', padding: 11, borderRadius: 10, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', minHeight: 46, fontFamily: 'inherit' }}>{btnLabelFor(d.type)}</button>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 18, background: 'var(--primary-soft)', borderRadius: 12, padding: '14px 18px', fontSize: 14, color: '#33415A', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span aria-hidden="true">🔒</span> การขอรับสิ่งของผูกโควตากับ ThaID เพื่อความเป็นธรรมและป้องกันการกักตุน
              </div>
            </>
          )}

          {tab === 'job' && (
            <div>
              {/* ปุ่มลงประกาศงาน */}
              <button onClick={openJobNew} style={{ width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 50, marginBottom: 16 }}>
                + ลงประกาศจ้างงาน / หาคนช่วย
              </button>

              {/* แถบความปลอดภัยช่วงภัยพิบัติ */}
              <div style={{ background: 'linear-gradient(180deg,#fff,#F4FBF8)', border: '1px solid var(--safe-soft)', borderRadius: 14, padding: '16px 18px', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>🛡️</span>
                  <b style={{ color: '#122A4A', fontSize: 15.5 }}>ความปลอดภัยช่วงน้ำท่วม</b>
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#41506B', lineHeight: 1.65 }}>
                  ทุกคนที่รับงานต้อง <b>ยืนยันตัวตนด้วย ThaID</b> · มี <b>ประวัติการทำงานและคะแนน</b> ติดตัว · ผู้ว่าจ้างและเทศบาลเห็นว่าใครเข้าพื้นที่ · <b>รายงานผู้ต้องสงสัยได้ทันที</b> เพื่อกันมิจฉาชีพแฝงตัวเข้าบ้านช่วงภัยพิบัติ
                </p>
              </div>

              {/* เชื่อมต่อ LINE สำหรับผู้ว่าจ้าง — รับแจ้งเตือนเมื่อมีคนกดรับงาน */}
              <div style={{ background: '#F0FBF4', border: '1px solid var(--safe-soft)', borderRadius: 14, padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20 }}>🔔</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 14.5 }}>เป็นผู้ว่าจ้าง? เชื่อมต่อ LINE รับแจ้งเตือน</div>
                  <div style={{ fontSize: 13, color: '#52607A' }}>พิมพ์เบอร์ที่ใช้ประกาศงาน แล้วกดเชื่อมต่อ จะได้รับแจ้งเตือนทันทีที่มีคนกดรับงาน</div>
                </div>
                <input type="tel" inputMode="numeric" value={posterPhone} onChange={(e) => setPosterPhone(e.target.value)} placeholder="เบอร์โทรผู้ว่าจ้าง" style={{ ...inputStyle, flex: '0 1 170px', minHeight: 44 }} />
                <a
                  href={PHONE_RE.test(posterPhone.trim()) ? lineLoginUrl(posterPhone.trim()) : undefined}
                  onClick={(e) => { if (!PHONE_RE.test(posterPhone.trim())) { e.preventDefault(); showToast('กรอกเบอร์โทร 10 หลักให้ถูกต้องก่อน'); } }}
                  style={{ background: PHONE_RE.test(posterPhone.trim()) ? '#06C755' : '#B8C2CE', color: '#fff', border: 'none', padding: '11px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 44, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  เชื่อมต่อ LINE
                </a>
              </div>

              {/* งานรอให้คะแนน */}
              {!doneRated && (
                <div style={{ background: '#fff', border: '1.5px solid var(--amber-soft)', borderRadius: 14, padding: 16, marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22 }}>⭐</span>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 14.5 }}>งานเสร็จแล้ว รอให้คะแนน</div>
                    <div style={{ fontSize: 13, color: '#52607A' }}>{SEED_DONE.title} · {SEED_DONE.poster}</div>
                  </div>
                  <button onClick={() => { setRateStars(0); setRateTags([]); setView('rate'); scrollTop(); }} style={{ background: 'var(--amber)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 44 }}>ให้คะแนน</button>
                </div>
              )}

              {/* การ์ดงาน */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {jobs.map((j) => {
                  const full = j.applied >= j.need;
                  const already = readApplied().includes(j.id);
                  const pct = Math.round((j.applied / j.need) * 100);
                  return (
                    <div key={j.id} className="yh-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(16,24,40,.05)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {j.urgent && <span className="pulse-red" style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: 'var(--danger-soft)', color: 'var(--danger)' }}>⚡ ด่วน</span>}
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: full ? 'rgba(90,102,117,.12)' : 'var(--safe-soft)', color: full ? '#5A6675' : 'var(--safe)' }}>{full ? 'ปิดรับ (เต็ม)' : `เปิดรับ ${j.applied}/${j.need}`}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: '#122A4A' }}>{j.title}</div>
                      <div style={{ fontSize: 14.5, color: 'var(--safe)', fontWeight: 700 }}>💰 {j.pay}</div>
                      <div style={{ fontSize: 13, color: '#52607A' }}>📍 {j.zone}</div>

                      {/* progress โควตา */}
                      <div style={{ height: 6, background: 'var(--line)', borderRadius: 100, overflow: 'hidden' }}>
                        <div className="yh-progress-fill" style={{ height: '100%', width: pct + '%', background: full ? '#9FB2C9' : 'var(--primary)', borderRadius: 100 }} />
                      </div>

                      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                        <TrustRow name={j.poster} rating={j.rating} jobs={j.jobs} verified={j.verified} />
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <button disabled={full || already} onClick={() => startApply(j)} style={{ flex: 1, background: full || already ? '#EDF1F6' : 'var(--primary)', color: full || already ? '#8592A3' : '#fff', border: 'none', padding: 11, borderRadius: 10, fontSize: 14.5, fontWeight: 700, cursor: full || already ? 'not-allowed' : 'pointer', minHeight: 46 }}>
                          {already ? '✓ สมัครแล้ว' : full ? 'เต็มแล้ว' : 'สมัครรับงาน'}
                        </button>
                        <button onClick={() => openJob(j)} style={{ background: '#fff', border: '1.5px solid var(--line)', color: 'var(--primary)', padding: '0 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46 }}>ดู</button>
                        <button title="รายงานปัญหา" onClick={() => { setReportJob(j); setReportReason(''); }} style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#B36B00', padding: '0 12px', borderRadius: 10, fontSize: 16, cursor: 'pointer', minHeight: 46 }}>⚑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- รายละเอียดงาน ---- */}
      {view === 'jobDetail' && selJob && (
        <div style={{ marginTop: 16 }}>
          <button onClick={backToList} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 15, cursor: 'pointer', marginBottom: 14, fontWeight: 600 }}>← กลับรายการ</button>
          <div style={card}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              {selJob.urgent && <span className="pulse-red" style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: 'var(--danger-soft)', color: 'var(--danger)' }}>⚡ ด่วน</span>}
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: selJob.applied >= selJob.need ? 'rgba(90,102,117,.12)' : 'var(--safe-soft)', color: selJob.applied >= selJob.need ? '#5A6675' : 'var(--safe)' }}>{selJob.applied >= selJob.need ? 'ปิดรับ (เต็ม)' : `เปิดรับ ${selJob.applied}/${selJob.need}`}</span>
            </div>
            <h2 style={{ fontSize: 22, margin: '0 0 6px' }}>{selJob.title}</h2>
            <div style={{ fontSize: 16, color: 'var(--safe)', fontWeight: 700, marginBottom: 4 }}>💰 {selJob.pay}</div>
            <div style={{ fontSize: 14, color: '#52607A', marginBottom: 16 }}>📍 {selJob.zone} · {selJob.note}</div>
            <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, color: '#52607A', fontWeight: 700, marginBottom: 8 }}>ผู้ว่าจ้าง</div>
              <TrustRow name={selJob.poster} rating={selJob.rating} jobs={selJob.jobs} verified={selJob.verified} />
            </div>
            <div style={{ background: 'var(--safe-soft)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#33415A', marginBottom: 18, display: 'flex', gap: 8 }}>
              <span>🛡️</span> เมื่อรับงาน ระบบจะบันทึกตัวตนของคุณไว้กับเทศบาล เพื่อความปลอดภัยของทั้งสองฝ่าย
            </div>
            <button disabled={selJob.applied >= selJob.need || readApplied().includes(selJob.id)} onClick={() => startApply(selJob)} style={{ ...primaryBtn, background: (selJob.applied >= selJob.need || readApplied().includes(selJob.id)) ? '#EDF1F6' : 'var(--primary)', color: (selJob.applied >= selJob.need || readApplied().includes(selJob.id)) ? '#8592A3' : '#fff', cursor: (selJob.applied >= selJob.need || readApplied().includes(selJob.id)) ? 'not-allowed' : 'pointer' }}>
              {readApplied().includes(selJob.id) ? '✓ สมัครงานนี้แล้ว' : selJob.applied >= selJob.need ? 'ปิดรับสมัครแล้ว' : 'สมัครรับงานนี้'}
            </button>
          </div>
        </div>
      )}

      {/* ---- สมัครรับงาน (ยืนยันตัวตน) ---- */}
      {view === 'jobApply' && selJob && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => { setView('jobDetail'); scrollTop(); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 15, cursor: 'pointer', marginBottom: 14, fontWeight: 600 }}>← ยกเลิก</button>
          <div style={card}>
            <h2 style={{ fontSize: 21, marginBottom: 4 }}>สมัครรับงาน</h2>
            <div style={{ fontSize: 14.5, color: '#52607A', marginBottom: 20 }}>{selJob.title} · {selJob.zone}</div>

            {applyStage === 'verify' && (
              <div>
                <div style={{ fontSize: 13.5, color: '#52607A', marginBottom: 14, lineHeight: 1.6 }}>เพื่อความปลอดภัยของชุมชน ผู้รับงานทุกคนต้องยืนยันตัวตนจริง — กรอกข้อมูลด้านล่าง หรือใช้ ThaID ก็ได้</div>

                {applyForm.idMethod === 'thaid' && applyForm.verified ? (
                  <div style={{ background: 'var(--safe-soft)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>🛡️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--safe)', fontSize: 15 }}>ยืนยันตัวตนด้วย ThaID สำเร็จ</div>
                      <button onClick={() => setApplyForm((f) => ({ ...f, idMethod: 'form', verified: false }))} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, cursor: 'pointer', padding: 0, marginTop: 2 }}>เปลี่ยนเป็นกรอกฟอร์มแทน</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label htmlFor="apname" style={label}>ชื่อ-นามสกุล</label>
                      <input id="apname" value={applyForm.name} onChange={(e) => setApplyForm((f) => ({ ...f, name: e.target.value }))} placeholder="ชื่อจริง-นามสกุล" style={inputStyle} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label htmlFor="apid" style={label}>เลขบัตรประชาชน 13 หลัก</label>
                      <input id="apid" type="tel" inputMode="numeric" maxLength={13} value={applyForm.nationalId} onChange={(e) => setApplyForm((f) => ({ ...f, nationalId: e.target.value.replace(/\D/g, '') }))} placeholder="x xxxx xxxxx xx x" style={{ ...inputStyle, letterSpacing: 1 }} />
                    </div>
                    <button onClick={runThaID} disabled={applyForm.verifying} style={{ width: '100%', background: '#fff', color: '#1A56DB', border: '1.5px solid #1A56DB', padding: '11px', borderRadius: 10, fontWeight: 700, fontSize: 14.5, cursor: applyForm.verifying ? 'wait' : 'pointer', minHeight: 46, marginBottom: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {applyForm.verifying ? <><span style={{ width: 15, height: 15, border: '2px solid rgba(26,86,219,.3)', borderTopColor: '#1A56DB', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} /> กำลังยืนยัน…</> : '🪪 หรือยืนยันด้วย ThaID (ถ้ามีแอป)'}
                    </button>
                  </>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="apphone" style={label}>เบอร์โทรติดต่อ</label>
                  <input id="apphone" type="tel" inputMode="numeric" value={applyForm.phone} onChange={(e) => setApplyForm((f) => ({ ...f, phone: e.target.value }))} placeholder="เช่น 0812345678" style={inputStyle} />
                </div>
                {applyForm.err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{applyForm.err}</div>}
                <button onClick={goConfirm} style={primaryBtn}>ถัดไป</button>
              </div>
            )}

            {applyStage === 'confirm' && (
              <div>
                <div style={{ background: 'var(--safe-soft)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 12.5, color: '#52607A', fontWeight: 700, marginBottom: 8 }}>โปรไฟล์ความน่าเชื่อถือของคุณ</div>
                  <TrustRow name={applyForm.name.trim() ? `${applyForm.name.trim()} (ยืนยันแล้ว)` : 'คุณ (ยืนยัน ThaID แล้ว)'} rating={myTrust?.rating} jobs={myTrust?.jobs || 0} verified />
                  {(!myTrust || !myTrust.jobs) && <div style={{ fontSize: 12.5, color: '#B36B00', marginTop: 10, lineHeight: 1.6 }}>💡 คุณยังไม่มีประวัติงาน เมื่อทำงานสำเร็จและได้รับคะแนน โปรไฟล์จะน่าเชื่อถือขึ้น ผู้ว่าจ้างจะไว้ใจมากขึ้น</div>}
                </div>
                <div style={{ background: 'var(--bg-alt)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, color: '#33415A', marginBottom: 18, lineHeight: 1.6 }}>
                  เมื่อกดยืนยัน: ข้อมูลตัวตนของคุณจะถูกส่งให้ผู้ว่าจ้าง <b>{selJob.poster}</b> และบันทึกไว้กับเทศบาลเพื่อความปลอดภัย
                </div>
                <button onClick={confirmApply} style={primaryBtn}>ยืนยันรับงาน</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- รับงานสำเร็จ ---- */}
      {view === 'jobDone' && selJob && (
        <div style={{ marginTop: 20, background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: '36px 28px', textAlign: 'center', boxShadow: '0 1px 3px rgba(16,24,40,.05)' }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <h2 style={{ fontSize: 22, margin: '12px 0 8px' }}>สมัครรับงานสำเร็จ</h2>
          <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 6px' }}>ผู้ว่าจ้าง <b>{selJob.poster}</b> จะติดต่อกลับ · ตัวตนของคุณถูกบันทึกกับเทศบาลแล้ว 🛡️</p>
          <div style={{ fontSize: 14, color: '#52607A', marginBottom: 24 }}>หมายเลขอ้างอิง: <b style={{ color: '#122A4A' }}>{ref}</b></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => { setTab('job'); backToList(); }} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '13px 24px', borderRadius: 11, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>กลับรายการงาน</button>
            <button onClick={() => navigate('/')} style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: '13px 24px', borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>หน้าแรก</button>
          </div>
        </div>
      )}

      {/* ---- ให้คะแนน ---- */}
      {view === 'rate' && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => { setTab('job'); backToList(); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 15, cursor: 'pointer', marginBottom: 14, fontWeight: 600 }}>← กลับ</button>
          <div style={{ ...card, textAlign: 'center' }}>
            <h2 style={{ fontSize: 21, marginBottom: 4 }}>ให้คะแนนผู้ว่าจ้าง</h2>
            <div style={{ fontSize: 14, color: '#52607A', marginBottom: 20 }}>{SEED_DONE.title} · {SEED_DONE.poster}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRateStars(s)} className={s <= rateStars ? 'yh-star yh-star-on' : 'yh-star'} style={{ background: 'none', border: 'none', fontSize: 38, cursor: 'pointer', color: s <= rateStars ? '#F5B301' : '#D6DEE8', lineHeight: 1, padding: 0 }}>★</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 22 }}>
              {RATE_TAGS.map((t) => {
                const on = rateTags.includes(t);
                return <button key={t} onClick={() => setRateTags((a) => on ? a.filter((x) => x !== t) : [...a, t])} style={optBtn(on)}>{t}</button>;
              })}
            </div>
            <button onClick={submitRate} disabled={rateStars < 1} style={{ ...primaryBtn, background: rateStars < 1 ? '#EDF1F6' : 'var(--primary)', color: rateStars < 1 ? '#8592A3' : '#fff', cursor: rateStars < 1 ? 'not-allowed' : 'pointer' }}>ส่งคะแนน</button>
          </div>
        </div>
      )}

      {/* ---- รายละเอียดคำขอ (บริจาค) ---- */}
      {view === 'detail' && sel && (
        <div style={{ marginTop: 16 }}>
          <button onClick={backToList} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 15, cursor: 'pointer', marginBottom: 14, fontWeight: 600 }}>← กลับรายการ</button>
          <div style={card}>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 100, background: selBadge.bg, color: selBadge.color }}>{selBadge.text}</span>
            <h2 style={{ fontSize: 22, margin: '10px 0 4px' }}>{sel.name}</h2>
            <div style={{ fontSize: 15, color: '#122A4A', fontWeight: 600, marginBottom: 4 }}>{sel.qty}</div>
            <div style={{ fontSize: 14, color: '#52607A', marginBottom: 22 }}>📍 {sel.zone} · {sel.note}</div>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
              <h3 style={{ fontSize: 17, marginBottom: 16 }}>{shareFormTitle}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label htmlFor="shname" style={label}>ชื่อ-นามสกุล</label><input id="shname" value={reqForm.name} onChange={(e) => setReqForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} /></div>
                <div><label htmlFor="shphone" style={label}>เบอร์ติดต่อ</label><input id="shphone" type="tel" inputMode="numeric" value={reqForm.phone} onChange={(e) => setReqForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 14 }}><label htmlFor="shqty" style={label}>จำนวน/รายละเอียด</label><input id="shqty" value={reqForm.qty} onChange={(e) => setReqForm((f) => ({ ...f, qty: e.target.value }))} placeholder="เช่น 2 แพ็ค" style={inputStyle} /></div>
              <div style={{ marginBottom: 20 }}><label htmlFor="shnote" style={label}>หมายเหตุ (ถ้ามี)</label><textarea id="shnote" rows={2} value={reqForm.note} onChange={(e) => setReqForm((f) => ({ ...f, note: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              {reqForm.err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{reqForm.err}</div>}
              {submitting
                ? <button disabled style={{ width: '100%', background: '#9FB2C9', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16, minHeight: 50, cursor: 'not-allowed' }}>กำลังส่ง…</button>
                : <button onClick={submitRequest} style={primaryBtn}>{shareSubmitLabel}</button>}
            </div>
          </div>
        </div>
      )}

      {/* ---- ลงประกาศใหม่ ---- */}
      {view === 'new' && (
        <div style={{ marginTop: 16 }}>
          <button onClick={backToList} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 15, cursor: 'pointer', marginBottom: 14, fontWeight: 600 }}>← กลับรายการ</button>
          <div style={card}>
            <h2 style={{ fontSize: 21, marginBottom: 20 }}>ลงประกาศใหม่</h2>
            <div style={{ marginBottom: 18 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#33415A', marginBottom: 10 }}>ประเภทประกาศ</span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {NEW_TYPES.map((t) => {
                  const on = newForm.type === t.k;
                  return <button key={t.k} onClick={() => setNewForm((f) => ({ ...f, type: t.k }))} style={optBtn(on)}><span aria-hidden="true">{on ? '●' : '○'}</span> {t.l}</button>;
                })}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}><label htmlFor="nnname" style={label}>ชื่อสิ่งของ/งาน</label><input id="nnname" value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} placeholder="เช่น น้ำดื่ม, อาสาขนของ" style={inputStyle} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label htmlFor="nnqty" style={label}>จำนวน</label><input id="nnqty" value={newForm.qty} onChange={(e) => setNewForm((f) => ({ ...f, qty: e.target.value }))} placeholder="เช่น 10 แพ็ค" style={inputStyle} /></div>
              <div><label htmlFor="nnzone" style={label}>พื้นที่</label><input id="nnzone" value={newForm.zone} onChange={(e) => setNewForm((f) => ({ ...f, zone: e.target.value }))} placeholder="เช่น ต.สะเตง" style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 20 }}><label htmlFor="nnnote" style={label}>หมายเหตุ</label><input id="nnnote" value={newForm.note} onChange={(e) => setNewForm((f) => ({ ...f, note: e.target.value }))} style={inputStyle} /></div>
            {newForm.err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{newForm.err}</div>}
            <button onClick={submitNew} style={primaryBtn}>เผยแพร่ประกาศ</button>
          </div>
        </div>
      )}

      {/* ---- ลงประกาศจ้างงาน ---- */}
      {view === 'jobNew' && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => { setTab('job'); setView('list'); scrollTop(); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 15, cursor: 'pointer', marginBottom: 14, fontWeight: 600 }}>← กลับรายการงาน</button>
          <div style={card}>
            <h2 style={{ fontSize: 21, marginBottom: 6 }}>ลงประกาศจ้างงาน</h2>
            <p style={{ fontSize: 14, color: '#52607A', margin: '0 0 20px' }}>ประกาศงานให้คนในชุมชนมารับ · จะได้รับแจ้งเตือนทาง LINE ทันทีที่มีคนกดรับ</p>
            <div style={{ marginBottom: 14 }}><label htmlFor="jtitle" style={label}>ชื่องาน *</label><input id="jtitle" value={jobForm.title} onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))} placeholder="เช่น ยกกระสอบทราย, พายเรือส่งของ" style={inputStyle} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label htmlFor="jpay" style={label}>ค่าตอบแทน</label><input id="jpay" value={jobForm.pay} onChange={(e) => setJobForm((f) => ({ ...f, pay: e.target.value }))} placeholder="เช่น 400 บ./วัน" style={inputStyle} /></div>
              <div><label htmlFor="jzone" style={label}>พื้นที่</label><input id="jzone" value={jobForm.zone} onChange={(e) => setJobForm((f) => ({ ...f, zone: e.target.value }))} placeholder="เช่น ต.สะเตง" style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 14 }}><label htmlFor="jnote" style={label}>รายละเอียดงาน</label><input id="jnote" value={jobForm.note} onChange={(e) => setJobForm((f) => ({ ...f, note: e.target.value }))} placeholder="เช่น บ้านริมคลอง ต้องการด่วนบ่ายนี้" style={inputStyle} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label htmlFor="jposter" style={label}>ชื่อผู้ว่าจ้าง *</label><input id="jposter" value={jobForm.poster} onChange={(e) => setJobForm((f) => ({ ...f, poster: e.target.value }))} placeholder="เช่น ร้านวัสดุบ้านรมย์" style={inputStyle} /></div>
              <div><label htmlFor="jneed" style={label}>รับกี่คน *</label><input id="jneed" type="number" min="1" inputMode="numeric" value={jobForm.need} onChange={(e) => setJobForm((f) => ({ ...f, need: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 16 }}><label htmlFor="jphone" style={label}>เบอร์โทรผู้ว่าจ้าง * (ไว้รับแจ้งเตือน LINE)</label><input id="jphone" type="tel" inputMode="numeric" value={jobForm.phone} onChange={(e) => setJobForm((f) => ({ ...f, phone: e.target.value }))} placeholder="เช่น 0812345678" style={inputStyle} /></div>
            <button onClick={() => setJobForm((f) => ({ ...f, urgent: !f.urgent }))} style={{ ...optBtn(jobForm.urgent), marginBottom: 20 }}><span aria-hidden="true">{jobForm.urgent ? '●' : '○'}</span> ⚡ งานด่วน (ต้องการคนเร่งด่วน)</button>
            {jobForm.err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{jobForm.err}</div>}
            <button onClick={submitJob} disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}>{submitting ? 'กำลังเผยแพร่…' : 'เผยแพร่ประกาศงาน'}</button>
          </div>
        </div>
      )}

      {/* ---- ลงประกาศงานสำเร็จ + ชวนเชื่อม LINE ---- */}
      {view === 'jobPosted' && (
        <div style={{ marginTop: 20, background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: '36px 28px', textAlign: 'center', boxShadow: '0 1px 3px rgba(16,24,40,.05)' }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <h2 style={{ fontSize: 22, margin: '12px 0 8px' }}>เผยแพร่ประกาศงานแล้ว!</h2>
          <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 20px', lineHeight: 1.6 }}>ประกาศของคุณขึ้นในรายการงานแล้ว<br />เชื่อมต่อ LINE เพื่อรับแจ้งเตือนทันทีที่มีคนกดรับงาน</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href={PHONE_RE.test(postedPhone) ? lineLoginUrl(postedPhone) : undefined}
              style={{ background: '#06C755', color: '#fff', border: 'none', padding: '13px 24px', borderRadius: 11, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 48, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              🔔 เชื่อมต่อ LINE รับแจ้งเตือน
            </a>
            <button onClick={() => { setTab('job'); setView('list'); scrollTop(); }} style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: '13px 24px', borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>ดูรายการงาน</button>
          </div>
        </div>
      )}

      {/* ---- คำขอบริจาคสำเร็จ ---- */}
      {view === 'done' && (
        <div style={{ marginTop: 20, background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: '36px 28px', textAlign: 'center', boxShadow: '0 1px 3px rgba(16,24,40,.05)' }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <h2 style={{ fontSize: 22, margin: '12px 0 8px' }}>ดำเนินการสำเร็จ</h2>
          <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 6px' }}>{shareDoneMsg}</p>
          <div style={{ fontSize: 14, color: '#52607A', marginBottom: 24 }}>หมายเลขอ้างอิง: <b style={{ color: '#122A4A' }}>{ref}</b></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={backToList} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '13px 24px', borderRadius: 11, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>กลับรายการ</button>
            <button onClick={() => navigate('/')} style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: '13px 24px', borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>หน้าแรก</button>
          </div>
        </div>
      )}

      {/* ---- Modal รายงานปัญหา ---- */}
      {reportJob && (
        <div onClick={() => setReportJob(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', animation: 'popIn .3s ease both' }}>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>รายงานปัญหา</h3>
            <div style={{ fontSize: 13.5, color: '#52607A', marginBottom: 16 }}>{reportJob.title} · {reportJob.poster}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {REPORT_REASONS.map((r) => {
                const on = reportReason === r;
                return <button key={r} onClick={() => setReportReason(r)} style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', border: on ? '1.5px solid var(--danger)' : '1.5px solid var(--line)', background: on ? 'var(--danger-soft)' : '#fff', color: on ? 'var(--danger)' : '#33415A', fontWeight: on ? 700 : 500 }}>{on ? '● ' : '○ '}{r}</button>;
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setReportJob(null)} style={{ flex: 1, background: '#fff', border: '1.5px solid var(--line)', color: '#33415A', padding: 12, borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: 'pointer', minHeight: 46 }}>ยกเลิก</button>
              <button onClick={submitReport} disabled={!reportReason} style={{ flex: 1, background: reportReason ? 'var(--danger)' : '#EDF1F6', color: reportReason ? '#fff' : '#8592A3', border: 'none', padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: reportReason ? 'pointer' : 'not-allowed', minHeight: 46 }}>ส่งรายงาน</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
