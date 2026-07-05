import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PHONE_RE, genRef } from '../lib/helpers';
import { insertMindRequest, notifyLine } from '../lib/db';
import { MindIcon } from '../components/Icons';

const QS_SCALE = [
  { t: 'แทบไม่มี', s: 0 },
  { t: 'เป็นบางครั้ง', s: 1 },
  { t: 'บ่อยครั้ง', s: 2 },
  { t: 'เป็นประจำ', s: 3 },
];
const QS = [
  'ช่วงนี้มีปัญหาการนอน นอนไม่หลับหรือหลับมากเกินไปไหมคะ',
  'ช่วงนี้รู้สึกมีสมาธิน้อยลงไหมคะ',
  'ช่วงนี้รู้สึกหงุดหงิด หรือโมโหง่ายไหมคะ',
  'ช่วงนี้รู้สึกเบื่อ เซ็ง หรือท้อแท้ไหมคะ',
  'ช่วงนี้ไม่อยากพบปะผู้คน อยากอยู่คนเดียวไหมคะ',
].map((q) => ({ q, opts: QS_SCALE }));

const GREET = { who: 'bot', text: 'สวัสดีค่ะ ยินดีที่ได้พูดคุย ที่นี่เป็นพื้นที่ปลอดภัย เราจะถามความรู้สึกสั้น ๆ 4 ข้อนะคะ' };

const MIND_CAP = 16;
const MIND_AVG = 9;

function readQueue() {
  try {
    const v = parseInt(localStorage.getItem('yh_mind_q'), 10);
    return Number.isNaN(v) ? 9 : v;
  } catch { return 9; }
}

function bubbleStyle(who) {
  const u = who === 'user';
  return {
    maxWidth: '86%', padding: '11px 14px', fontSize: 14.5, lineHeight: 1.55,
    borderRadius: u ? '15px 4px 15px 15px' : '4px 15px 15px 15px',
    background: u ? 'var(--primary)' : '#F4F6F9',
    color: u ? '#fff' : '#26344C',
    border: u ? 'none' : '1px solid #E7ECF2',
  };
}

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(20px,3vw,28px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const inputStyle = { width: '100%', padding: '13px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, color: '#122A4A', minHeight: 50 };

export default function Mind() {
  const { showToast, profile, updateProfile } = useApp();

  const [msgs, setMsgs] = useState([GREET, { who: 'bot', text: QS[0].q }]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [urgent, setUrgent] = useState(false);

  const [reqStage, setReqStage] = useState('');
  const [reqPhone, setReqPhone] = useState(profile.phone || '');
  const [reqErr, setReqErr] = useState('');
  const [reqPos, setReqPos] = useState(0);
  const [reqWait, setReqWait] = useState(0);
  const [reqRef, setReqRef] = useState('');
  const [queue, setQueue] = useState(readQueue);

  const resetAssessment = () => {
    setMsgs([GREET, { who: 'bot', text: QS[0].q }]);
    setStep(0); setScore(0); setDone(false); setUrgent(false);
  };

  const pick = (opt) => {
    if (step >= QS.length) return;
    const nextMsgs = [...msgs, { who: 'user', text: opt.t }];
    const newScore = score + opt.s;
    const next = step + 1;
    if (next < QS.length) {
      nextMsgs.push({ who: 'bot', text: QS[next].q });
      setMsgs(nextMsgs); setStep(next); setScore(newScore);
    } else {
      let closing;
      if (newScore <= 4) closing = 'ขอบคุณที่แบ่งปันนะคะ คะแนน ST-5 อยู่ในเกณฑ์เครียดน้อย ดูแลตัวเองต่อไป และถ้าเมื่อไรรู้สึกหนักใจ กลับมาคุยกันได้เสมอค่ะ';
      else if (newScore <= 7) closing = 'ขอบคุณที่เปิดใจค่ะ คะแนน ST-5 อยู่ในเกณฑ์เครียดปานกลาง ลองพักและพูดคุยกับคนใกล้ตัว หากต้องการ กดปุ่มด้านล่างเพื่อจองคิวให้ทีมดูแลใจติดต่อกลับได้นะคะ';
      else closing = 'ขอบคุณที่ไว้ใจเล่าให้ฟังนะคะ คะแนน ST-5 อยู่ในเกณฑ์เครียดสูง ความรู้สึกแบบนี้ไม่ควรเผชิญคนเดียว หากอยู่ในภาวะเสี่ยง แนะนำโทร 1323 ได้ทันที หรือกดจองคิวด่วนให้ทีมโทรกลับค่ะ';
      nextMsgs.push({ who: 'bot', text: closing });
      setMsgs(nextMsgs); setStep(next); setScore(newScore); setDone(true); setUrgent(newScore >= 8);
    }
  };

  const callHotline = () => showToast('กำลังต่อสายด่วนสุขภาพจิต 1323…');
  const callOsm = () => showToast('กำลังต่อสายด่วนเทศบาล / อสม. เวรในพื้นที่…');

  const openTeamRequest = () => {
    const full = queue >= MIND_CAP && !urgent;
    setReqStage(full ? 'full' : 'phone');
    setReqPhone(''); setReqErr('');
  };
  const closeTeamReq = () => setReqStage('');

  const submitTeamRequest = () => {
    const phone = reqPhone.trim();
    if (!PHONE_RE.test(phone)) { setReqErr('กรุณากรอกเบอร์โทร 10 หลักให้ถูกต้อง'); return; }
    try {
      const key = 'yh_mind_req_' + phone;
      const last = parseInt(localStorage.getItem(key), 10);
      if (!Number.isNaN(last) && (Date.now() - last) < 86400000) {
        setReqErr('เบอร์นี้เพิ่งส่งคำขอไปแล้ววันนี้ · ทีมจะติดต่อกลับตามคิว หากเร่งด่วนโทร 1323 ได้ทันที');
        return;
      }
      localStorage.setItem(key, String(Date.now()));
    } catch { /* noop */ }
    const pos = urgent ? 1 : (queue + 1);
    const wait = urgent ? 5 : Math.min(180, pos * MIND_AVG);
    const nq = queue + 1;
    try { localStorage.setItem('yh_mind_q', String(nq)); } catch { /* noop */ }
    setQueue(nq);
    const newRef = genRef('MD', 5);
    setReqStage('done'); setReqPos(pos); setReqWait(wait); setReqRef(newRef); setReqErr('');
    showToast(urgent ? 'จองคิวด่วนสำเร็จ ทีมจะติดต่อกลับโดยเร็ว' : 'จองคิวสำเร็จ');
    insertMindRequest({ ref: newRef, phone, urgent, position: pos });
    updateProfile({ phone });
    notifyLine(phone, `💚 จองคิวทีมดูแลใจแล้ว | Yala Household\nเลขอ้างอิง: ${newRef}\n${urgent ? '⚡ คิวด่วน — ทีมจะติดต่อกลับโดยเร็ว' : `คิวที่ ${pos} · รอประมาณ ${wait} นาที`}\nหากเร่งด่วนโทร 1323 ได้ทันที`);
  };

  const options = (!done && QS[step]) ? QS[step].opts : [];
  let resTitle = '', resText = '', resBg = '', resColor = '';
  if (done) {
    if (score <= 4) { resTitle = `ST-5 · เครียดน้อย (${score}/15)`; resText = 'โดยรวมยังรับมือได้ดี ดูแลการพักผ่อนและคนรอบข้างต่อไปนะคะ'; resBg = 'rgba(14,138,95,.1)'; resColor = '#0E8A5F'; }
    else if (score <= 7) { resTitle = `ST-5 · เครียดปานกลาง (${score}/15)`; resText = 'ควรได้รับการดูแลติดตาม กดปุ่มด้านล่างเพื่อจองคิวให้ทีมดูแลใจติดต่อกลับได้'; resBg = 'rgba(179,107,0,.1)'; resColor = '#B36B00'; }
    else { resTitle = `ST-5 · เครียดสูง (${score}/15)`; resText = 'แนะนำให้พูดคุยกับบุคลากรโดยเร็ว กดปุ่มด้านล่างเพื่อจองคิวด่วน หรือโทร 1323 ได้ทันที'; resBg = 'rgba(192,54,46,.09)'; resColor = '#C0362E'; }
  }
  const queueWaitNow = Math.min(180, (queue + 1) * MIND_AVG);

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--safe-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MindIcon color="var(--safe)" size={24} />
        </span>
        <h1 style={{ fontSize: 'clamp(24px,3.6vw,32px)' }}>คุยกับใจ</h1>
      </div>
      <p style={{ color: '#52607A', fontSize: 15.5, margin: '0 0 20px' }}>พื้นที่ปลอดภัยสำหรับประเมินความรู้สึกเบื้องต้น · การประเมินนี้เป็นตัวช่วยคัดกรอง ไม่ใช่การวินิจฉัย</p>

      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: '0 1px 3px rgba(16,24,40,.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 460 }}>
        <div style={{ background: 'var(--primary)', color: '#fff', padding: '13px 18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 9 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CD3A0', animation: 'softblink 1.6s infinite' }} /> ผู้ช่วยคุยกับใจ
        </div>
        <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.who === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={bubbleStyle(m.who)}>{m.text}</div>
            </div>
          ))}
          {options.length > 0 && (
            <div role="group" aria-label="ตัวเลือกคำตอบ" style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 4, alignSelf: 'flex-end', justifyContent: 'flex-end', maxWidth: '94%' }}>
              {options.map((o) => (
                <button key={o.t} onClick={() => pick(o)} style={{ background: '#fff', border: '1.5px solid var(--primary)', color: 'var(--primary)', padding: '10px 15px', borderRadius: 100, fontSize: 14.5, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{o.t}</button>
              ))}
            </div>
          )}
          {done && (
            <>
              <div style={{ background: resBg, border: '1px solid ' + resColor, borderRadius: 12, padding: 16, color: resColor, alignSelf: 'stretch', marginTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{resTitle}</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{resText}</div>
              </div>
              <button onClick={resetAssessment} style={{ alignSelf: 'center', marginTop: 4, background: 'none', border: 'none', color: '#7A8699', fontSize: 13.5, cursor: 'pointer', textDecoration: 'underline' }}>เริ่มประเมินใหม่</button>
            </>
          )}
        </div>
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)', background: '#FAFBFC', display: 'flex', gap: 10 }}>
          <button onClick={callHotline} style={{ flex: 1, background: 'var(--danger)', color: '#fff', border: 'none', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 46 }}>☎ โทร 1323</button>
          {urgent
            ? <button onClick={openTeamRequest} className="pulse-red" style={{ flex: 1.3, background: 'var(--danger)', color: '#fff', border: 'none', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 46 }}>⚡ จองคิวด่วน (คิวลัด)</button>
            : <button onClick={openTeamRequest} style={{ flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 46 }}>จองคิวทีมดูแลใจ</button>}
        </div>
      </div>

      {reqStage !== '' && (
        <div style={{ marginTop: 16, ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <h3 style={{ fontSize: 18 }}>จองคิวให้ทีมดูแลใจติดต่อกลับ</h3>
            <button onClick={closeTeamReq} aria-label="ปิด" style={{ background: 'none', border: 'none', color: '#8592A3', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 0, flex: 'none' }}>×</button>
          </div>

          {reqStage === 'phone' && (
            <>
              {urgent && (
                <div style={{ background: 'var(--danger-soft)', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: 'var(--danger)', marginBottom: 14, lineHeight: 1.5 }}>
                  <b>ประเมินพบความเสี่ยงสูง</b> — หากอยู่ในภาวะวิกฤต โทร <b>1323</b> ได้ทันที ระบบจะจัดคิวของคุณเป็นลำดับด่วน
                </div>
              )}
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', background: 'var(--primary-soft)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 14, color: '#33415A', lineHeight: 1.5 }}>
                <span aria-hidden="true">⏳</span><span>ขณะนี้มีผู้รออยู่ <b>{queue}</b> ราย · เฉลี่ยติดต่อกลับใน ~<b>{queueWaitNow}</b> นาที</span>
              </div>
              <label htmlFor="mreqphone" style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#33415A', marginBottom: 7 }}>เบอร์โทรให้ทีมติดต่อกลับ</label>
              <input id="mreqphone" type="tel" inputMode="numeric" maxLength={10} placeholder="เช่น 0812345678" value={reqPhone} onChange={(e) => setReqPhone(e.target.value)} style={inputStyle} />
              {reqErr && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>{reqErr}</div>}
              <button onClick={submitTeamRequest} style={{ marginTop: 16, width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16.5, cursor: 'pointer', minHeight: 50 }}>จองคิวรับการติดต่อกลับ</button>
              <p style={{ fontSize: 13, color: '#8592A3', margin: '12px 0 0', textAlign: 'center', lineHeight: 1.55 }}>จำกัด 1 คำขอต่อเบอร์ต่อวัน เพื่อไม่ให้ทีมงานล้นมือ · หากเร่งด่วนใช้ปุ่มโทร 1323 ด้านบนได้เสมอ</p>
            </>
          )}

          {reqStage === 'done' && (
            <div style={{ textAlign: 'center', padding: '2px 0 4px' }}>
              <div aria-hidden="true" style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--safe-soft)', color: 'var(--safe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#122A4A', marginBottom: 10 }}>จองคิวสำเร็จ</div>
              <div style={{ display: 'inline-flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', background: '#F4F6F9', borderRadius: 12, padding: '16px 24px' }}>
                <div><div style={{ fontSize: 12.5, color: '#7A8699' }}>ลำดับคิว</div><div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 26, fontWeight: 700, color: 'var(--primary)' }}>{reqPos}</div></div>
                <div><div style={{ fontSize: 12.5, color: '#7A8699' }}>คาดว่าติดต่อใน</div><div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 26, fontWeight: 700, color: 'var(--primary)' }}>~{reqWait} น.</div></div>
              </div>
              <div style={{ fontSize: 13.5, color: '#52607A', marginTop: 10 }}>เลขคำขอ {reqRef}</div>
              <p style={{ fontSize: 14, color: '#52607A', margin: '14px auto 0', maxWidth: 420, lineHeight: 1.55 }}>ระหว่างรอ หากรู้สึกแย่ลงหรืออยู่ในภาวะวิกฤต โทร <b style={{ color: 'var(--danger)' }}>1323</b> ได้ทันทีตลอด 24 ชม.</p>
              <button onClick={callHotline} style={{ marginTop: 14, background: 'var(--danger)', color: '#fff', border: 'none', padding: '13px 26px', borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: 'pointer', minHeight: 48 }}>☎ โทร 1323 เดี๋ยวนี้</button>
            </div>
          )}

          {reqStage === 'full' && (
            <>
              <div style={{ background: 'var(--amber-soft)', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#8A5200', marginBottom: 4 }}>คิวเต็มชั่วคราว ({queue} ราย)</div>
                <div style={{ fontSize: 14, color: '#6B5220', lineHeight: 1.55 }}>ขณะนี้มีผู้รอจำนวนมาก เพื่อไม่ให้คุณต้องรอนานเกินไป แนะนำช่องทางที่ติดต่อได้ทันที</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={callHotline} style={{ width: '100%', background: 'var(--danger)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: 'pointer', minHeight: 50 }}>☎ โทรสายด่วนสุขภาพจิต 1323</button>
                <button onClick={callOsm} style={{ width: '100%', background: '#fff', border: '1.5px solid var(--primary)', color: 'var(--primary)', padding: 14, borderRadius: 11, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', minHeight: 50 }}>ติดต่อ อสม. เวร / สายด่วนเทศบาล</button>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
        <h3 style={{ fontSize: 15.5, marginBottom: 8 }}>เกี่ยวกับบริการนี้</h3>
        <p style={{ fontSize: 14.5, color: '#52607A', margin: 0, lineHeight: 1.6 }}>
          ประเมินตามแนวเกณฑ์ ST5 / 2Q / 9Q ของกรมสุขภาพจิต ระบบคัดกรองความเสี่ยงก่อน เพื่อส่งเฉพาะเคสที่ควรได้รับการดูแลไปยัง<b>ทีมดูแลใจ</b> (อสม. · นักจิตวิทยา · จิตอาสาที่ผ่านการอบรม) และกระจายงานตามพื้นที่และภาระงาน จึงไม่กระจุกอยู่ที่ อสม. คนใดคนหนึ่ง
        </p>
      </div>
    </main>
  );
}
