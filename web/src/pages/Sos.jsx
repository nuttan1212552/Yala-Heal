import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PHONE_RE, genRef, scrollTop, stepBars } from '../lib/helpers';
import { insertSosReport, requestOtp, verifyOtp, lineLoginUrl } from '../lib/db';
import { SosIcon } from '../components/Icons';

const SOS_TYPES = ['น้ำท่วม/ต้องอพยพ', 'ผู้ป่วย/บาดเจ็บ', 'ติดค้าง/ขาดอาหาร', 'อื่น ๆ'];
const SOS_VULN = ['ผู้สูงอายุ', 'เด็กเล็ก', 'ผู้ป่วยติดเตียง', 'ผู้พิการ'];
const TRACK_LABELS = [
  { label: 'รับเรื่องแล้ว', sub: 'ระบบบันทึกการแจ้งเหตุ' },
  { label: 'กำลังจัดทีม', sub: 'ประสานทีมกู้ภัยใกล้ที่สุด' },
  { label: 'กำลังเดินทาง', sub: 'ทีมออกเดินทางไปหาคุณ' },
  { label: 'เสร็จสิ้น', sub: 'ปลอดภัยแล้ว ปิดเคส' },
];
const STATUS_MAP = ['ได้รับเรื่องแล้ว', 'กำลังจัดทีม', 'ทีมกำลังเดินทาง', 'เสร็จสิ้น'];

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(22px,3vw,32px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const inputStyle = { width: '100%', padding: '13px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 17, color: '#122A4A', background: '#fff', minHeight: 50 };
const primaryBtn = { marginTop: 20, width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16.5, cursor: 'pointer', minHeight: 50 };
const optBtn = (on) => ({ textAlign: 'left', cursor: 'pointer', padding: '13px 14px', borderRadius: 11, fontSize: 15, fontWeight: 600, minHeight: 50, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });
const pillBtn = (on) => ({ cursor: 'pointer', padding: '11px 15px', borderRadius: 100, fontSize: 14.5, fontWeight: 600, minHeight: 44, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });

const initialForm = { type: SOS_TYPES[0], people: 1, vuln: [], note: '' };

export default function Sos() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [stage, setStage] = useState('phone');
  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpChannel, setOtpChannel] = useState('demo'); // line | demo
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendLeft, setResendLeft] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [track, setTrack] = useState(0);
  const [ticket, setTicket] = useState('');
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startResend = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendLeft(60);
    timerRef.current = setInterval(() => {
      setResendLeft((n) => {
        if (n <= 1) { clearInterval(timerRef.current); timerRef.current = null; return 0; }
        return n - 1;
      });
    }, 1000);
  };

  const resetAll = () => {
    setStage('phone'); setPhone(''); setPhoneErr(''); setOtp(''); setOtpErr('');
    setForm(initialForm); setTrack(0); setTicket('');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setResendLeft(0);
    scrollTop();
  };

  const submitPhone = async () => {
    const p = phone.trim();
    if (!PHONE_RE.test(p)) { setPhoneErr('กรุณากรอกเบอร์มือถือ 10 หลัก (ขึ้นต้นด้วย 0)'); return; }
    if (otpBusy) return;
    setPhoneErr(''); setOtpBusy(true);
    const r = await requestOtp(p);
    setOtpBusy(false);
    setOtpToken(r.token || '');
    if (r.sent && r.channel === 'line') {
      setOtpChannel('line');
      showToast('ส่งรหัส OTP เข้า LINE ของคุณแล้ว 📲');
    } else {
      setOtpChannel('demo');
      showToast('ใช้รหัสสาธิต 123456 (เบอร์นี้ยังไม่ได้เชื่อม LINE)');
    }
    setOtp(''); setOtpErr(''); setStage('otp');
    startResend();
  };

  const submitOtp = async () => {
    const o = otp.trim();
    if (!/^\d{6}$/.test(o)) { setOtpErr('กรุณากรอกรหัส 6 หลัก'); return; }
    if (otpBusy) return;
    setOtpBusy(true);
    const ok = await verifyOtp(phone.trim(), o, otpToken);
    setOtpBusy(false);
    if (!ok) { setOtpErr('รหัส OTP ไม่ถูกต้องหรือหมดอายุ ลองใหม่อีกครั้ง'); return; }
    setOtpErr(''); setStage('form');
  };

  const resendOtp = async () => {
    if (resendLeft > 0 || otpBusy) return;
    setOtpBusy(true);
    const r = await requestOtp(phone.trim());
    setOtpBusy(false);
    setOtpToken(r.token || '');
    if (r.sent && r.channel === 'line') { setOtpChannel('line'); showToast('ส่งรหัสใหม่เข้า LINE แล้ว 📲'); }
    else { setOtpChannel('demo'); showToast('ส่งรหัสใหม่แล้ว (สาธิต: 123456)'); }
    startResend();
  };

  const toggleVuln = (v) => {
    setForm((f) => {
      const has = f.vuln.includes(v);
      return { ...f, vuln: has ? f.vuln.filter((x) => x !== v) : [...f.vuln, v] };
    });
  };

  const submitReport = () => {
    const newTicket = genRef('YH', 6);
    setTicket(newTicket);
    setTrack(0);
    setStage('tracking');
    scrollTop();
    showToast('ส่งแจ้งเหตุเรียบร้อย ทีมกำลังดำเนินการ');
    insertSosReport({ ticket: newTicket, phone, type: form.type, people: form.people, vuln: form.vuln, note: form.note });
  };

  const advanceTrack = () => setTrack((t) => Math.min(3, t + 1));

  const idx = stage === 'phone' ? 0 : stage === 'otp' ? 1 : stage === 'form' ? 2 : 3;
  const bars = stepBars(4, idx);
  const notDone = track < 3;
  const done = track >= 3;
  const assigned = track >= 1;
  const pillBg = track === 3 ? 'rgba(14,138,95,.12)' : track === 1 ? 'rgba(179,107,0,.12)' : 'var(--primary-soft)';
  const pillColor = ['var(--primary)', '#B36B00', 'var(--primary)', '#0E8A5F'][track];

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SosIcon color="var(--danger)" size={24} />
        </span>
        <h1 style={{ fontSize: 'clamp(24px,3.6vw,32px)' }}>SOS แจ้งเหตุฉุกเฉิน</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '18px 0 24px' }}>
        {bars.map((s, i) => <div key={i} style={s} />)}
      </div>

      {stage === 'phone' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 8 }}>ยืนยันตัวตนก่อนใช้งาน</h2>
          <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 22px' }}>เพื่อป้องกันการแจ้งเหตุเท็จ ระบบจะส่งรหัส OTP เข้า <b>LINE</b> ของคุณ (ถ้าเชื่อมไว้) หรือใช้รหัสสาธิตก็ได้</p>
          <label htmlFor="sosphone" style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 7 }}>เบอร์โทรศัพท์มือถือ</label>
          <input id="sosphone" type="tel" inputMode="numeric" maxLength={10} placeholder="เช่น 0812345678" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          {phoneErr && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 8 }}>{phoneErr}</div>}
          <button onClick={submitPhone} disabled={otpBusy} style={{ ...primaryBtn, opacity: otpBusy ? 0.6 : 1 }}>{otpBusy ? 'กำลังส่งรหัส…' : 'ขอรหัส OTP'}</button>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--danger-soft)', borderRadius: 10, padding: '12px 14px' }}>
            <span aria-hidden="true" style={{ color: 'var(--danger)', fontWeight: 700 }}>☎</span>
            <span style={{ fontSize: 14, color: '#3A485F', lineHeight: 1.55 }}>กรณีเน็ต/ไฟดับ หรือเหตุคับขัน โทรสายด่วน <b style={{ color: 'var(--danger)' }}>199</b> ได้ทันทีโดยไม่ต้องยืนยันตัวตน</span>
          </div>
        </div>
      )}

      {stage === 'otp' && (
        <div style={card}>
          <h2 style={{ fontSize: 21, marginBottom: 8 }}>กรอกรหัส OTP</h2>
          {otpChannel === 'line'
            ? <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 8px' }}>ส่งรหัส 6 หลักเข้า <b style={{ color: '#06C755' }}>LINE</b> ของเบอร์ <b style={{ color: '#122A4A' }}>{phone}</b> แล้ว 📲</p>
            : <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 8px' }}>เบอร์ <b style={{ color: '#122A4A' }}>{phone}</b> ยังไม่ได้เชื่อม LINE</p>}
          {otpChannel === 'line'
            ? <div style={{ fontSize: 13.5, color: '#06C755', background: 'rgba(6,199,85,.1)', borderRadius: 8, padding: '8px 12px', marginBottom: 20, display: 'inline-block' }}>เปิดแอป LINE เพื่อดูรหัส (หรือใช้ 123456 สำหรับสาธิต)</div>
            : <div style={{ fontSize: 13.5, color: 'var(--safe)', background: 'var(--safe-soft)', borderRadius: 8, padding: '8px 12px', marginBottom: 20, display: 'inline-block' }}>โหมดสาธิต — กรอกรหัส <b>123456</b></div>}
          <label htmlFor="sosotp" style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 7 }}>รหัส OTP</label>
          <input id="sosotp" type="tel" inputMode="numeric" maxLength={6} placeholder="______" value={otp} onChange={(e) => setOtp(e.target.value)} style={{ ...inputStyle, fontSize: 24, letterSpacing: 10, textAlign: 'center', minHeight: 56 }} />
          {otpErr && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 8 }}>{otpErr}</div>}
          <button onClick={submitOtp} disabled={otpBusy} style={{ ...primaryBtn, opacity: otpBusy ? 0.6 : 1 }}>{otpBusy ? 'กำลังตรวจสอบ…' : 'ยืนยันรหัส'}</button>
          {otpChannel !== 'line' && (
            <a href={PHONE_RE.test(phone.trim()) ? lineLoginUrl(phone.trim()) : undefined} style={{ display: 'block', textAlign: 'center', marginTop: 12, color: '#06C755', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              เชื่อมต่อ LINE เพื่อรับ OTP จริงครั้งหน้า →
            </a>
          )}
          {resendLeft <= 0
            ? <button onClick={resendOtp} style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14.5, cursor: 'pointer', textDecoration: 'underline' }}>ส่งรหัสอีกครั้ง</button>
            : <div aria-live="polite" style={{ marginTop: 10, textAlign: 'center', color: '#8592A3', fontSize: 14 }}>ส่งรหัสอีกครั้งได้ใน {resendLeft} วินาที</div>}
        </div>
      )}

      {stage === 'form' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--safe)', fontSize: 14, fontWeight: 600, marginBottom: 18 }}><span aria-hidden="true">✓</span> ยืนยันตัวตนเรียบร้อย</div>
          <h2 style={{ fontSize: 21, marginBottom: 20 }}>รายละเอียดการแจ้งเหตุ</h2>
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 10 }}>ประเภทเหตุ</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              {SOS_TYPES.map((t) => {
                const on = form.type === t;
                return <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))} style={optBtn(on)}><span aria-hidden="true">{on ? '●' : '○'}</span> {t}</button>;
              })}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 10 }}>จำนวนผู้ประสบภัย</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setForm((f) => ({ ...f, people: Math.max(1, f.people - 1) }))} aria-label="ลดจำนวน" style={{ width: 48, height: 48, borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontSize: 22, cursor: 'pointer', color: '#122A4A' }}>−</button>
              <span aria-live="polite" style={{ fontSize: 22, fontWeight: 700, color: '#122A4A', minWidth: 40, textAlign: 'center' }}>{form.people}</span>
              <button onClick={() => setForm((f) => ({ ...f, people: Math.min(99, f.people + 1) }))} aria-label="เพิ่มจำนวน" style={{ width: 48, height: 48, borderRadius: 11, border: '1.5px solid var(--line)', background: '#fff', fontSize: 22, cursor: 'pointer', color: '#122A4A' }}>+</button>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 10 }}>มีกลุ่มเปราะบางหรือไม่ (เลือกได้หลายข้อ)</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {SOS_VULN.map((v) => {
                const on = form.vuln.includes(v);
                return <button key={v} onClick={() => toggleVuln(v)} style={pillBtn(on)}><span aria-hidden="true">{on ? '☑' : '☐'}</span> {v}</button>;
              })}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 10 }}>ตำแหน่งที่เกิดเหตุ</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F4F6F9', border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
              <span aria-hidden="true" style={{ color: 'var(--primary)' }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#122A4A', fontSize: 15 }}>ถ.สิโรรส ต.สะเตง อ.เมืองยะลา</div>
                <div style={{ fontSize: 13, color: 'var(--safe)' }}>✓ ส่งพิกัดอัตโนมัติผ่าน LINE Location แล้ว</div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="sosnote" style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 8 }}>รายละเอียดเพิ่มเติม (ถ้ามี)</label>
            <textarea id="sosnote" rows={3} placeholder="เช่น ระดับน้ำ ทางเข้า จุดสังเกต" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={{ ...inputStyle, fontSize: 16, resize: 'vertical' }} />
          </div>
          <button onClick={submitReport} style={{ width: '100%', background: 'var(--danger)', color: '#fff', border: 'none', padding: 16, borderRadius: 11, fontWeight: 700, fontSize: 17, cursor: 'pointer', minHeight: 52 }}>ส่งแจ้งเหตุฉุกเฉิน</button>
        </div>
      )}

      {stage === 'tracking' && (
        <div style={card}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18, borderBottom: '1px solid var(--line)', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 13, color: '#52607A' }}>หมายเลขการแจ้งเหตุ</div>
              <div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 22, fontWeight: 700, color: '#122A4A' }}>{ticket}</div>
            </div>
            <div style={{ background: pillBg, color: pillColor, padding: '8px 15px', borderRadius: 100, fontSize: 14, fontWeight: 700 }}>{STATUS_MAP[track]}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#F4F6F9', borderRadius: 11, padding: 14 }}><div style={{ fontSize: 12.5, color: '#52607A', marginBottom: 3 }}>ประเภทเหตุ</div><div style={{ fontWeight: 600, color: '#122A4A' }}>{form.type}</div></div>
            <div style={{ background: '#F4F6F9', borderRadius: 11, padding: 14 }}><div style={{ fontSize: 12.5, color: '#52607A', marginBottom: 3 }}>ผู้ประสบภัย</div><div style={{ fontWeight: 600, color: '#122A4A' }}>{form.people} คน</div></div>
          </div>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>สถานะการช่วยเหลือ</h3>
          <div style={{ marginBottom: 22 }}>
            {TRACK_LABELS.map((n, i) => {
              const nodeDone = i < track, cur = i === track, act = i <= track, last = i === 3;
              return (
                <div key={n.label} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                      fontSize: 14, fontWeight: 800,
                      background: act ? (nodeDone ? '#0E8A5F' : 'var(--primary)') : '#EAEEF3',
                      color: act ? '#fff' : '#98A2B0',
                      boxShadow: cur ? '0 0 0 5px var(--primary-soft)' : 'none',
                      transition: 'all .3s',
                    }}>{nodeDone ? '✓' : ''}</div>
                    <div style={{ width: 2, flex: 1, minHeight: 16, borderRadius: 2, background: nodeDone ? '#0E8A5F' : 'var(--line)', display: last ? 'none' : 'block' }} />
                  </div>
                  <div style={{ paddingBottom: 18 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: act ? '#122A4A' : '#98A2B0' }}>{n.label}</div>
                    <div style={{ fontSize: 13, color: act ? '#5A6675' : '#AEB6C2', marginTop: 2 }}>{n.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {assigned && (
            <div style={{ background: 'var(--primary-soft)', borderRadius: 11, padding: '14px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span aria-hidden="true" style={{ fontSize: 20 }}>🚑</span>
              <div><div style={{ fontWeight: 600, color: '#122A4A', fontSize: 15 }}>ทีมกู้ภัยชุมชนสะเตง (ตัวอย่าง)</div><div style={{ fontSize: 13.5, color: '#52607A' }}>คาดว่าถึงภายใน ~15 นาที</div></div>
            </div>
          )}
          {notDone && <button onClick={advanceTrack} style={{ width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 14, borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: 'pointer', minHeight: 48 }}>จำลองความคืบหน้า →</button>}
          {done && (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ fontSize: 34 }}>✅</div>
                <div style={{ fontWeight: 700, color: 'var(--safe)', fontSize: 18, margin: '6px 0 16px' }}>ช่วยเหลือสำเร็จ ปิดเคสเรียบร้อย</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={resetAll} style={{ flex: 1, minWidth: 150, background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: 14, borderRadius: 11, fontWeight: 600, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>แจ้งเหตุใหม่</button>
                <button onClick={() => navigate('/')} style={{ flex: 1, minWidth: 150, background: 'var(--primary)', color: '#fff', border: 'none', padding: 14, borderRadius: 11, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 48 }}>กลับหน้าแรก</button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
