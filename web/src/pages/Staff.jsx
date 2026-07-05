import { useEffect, useMemo, useState } from 'react';
import { fetchReliefClaims, updateReliefStatus, fetchAllHouseholds, fetchAllWelfareRequests, updateWelfareStatus, insertWelfareRequest, notifyLine } from '../lib/db';
import { notifyCard, row, SITE } from '../lib/flex';
import { genRef } from '../lib/helpers';
import { DashboardIcon } from '../components/Icons';
import HouseholdMap from '../components/HouseholdMap';
import { STAFF_ROLES, readStaffRole, loginStaff, logoutStaff } from '../lib/staff';

const GRADE = {
  '1': { c: '#0E8A5F', bg: 'rgba(14,138,95,.12)', t: 'เล็กน้อย' },
  '2': { c: '#B36B00', bg: 'rgba(179,107,0,.12)', t: 'ปานกลาง' },
  '3': { c: '#C0362E', bg: 'rgba(192,54,46,.1)', t: 'หนัก' },
  '4': { c: '#8B1A10', bg: 'rgba(139,26,16,.1)', t: 'สิ้นเชิง' },
};
const STATUS_C = { 'อนุมัติแล้ว': '#0E8A5F', 'ตีกลับ': '#C0362E' };
const WELFARE_STEPS = ['ยื่นคำขอ', 'อนุมัติ', 'อยู่ระหว่างจัดส่ง', 'ส่งมอบแล้ว'];

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(16,24,40,.05)' };

function Stat({ label, value, color }) {
  return (
    <div style={{ ...card, flex: '1 1 120px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 30, fontWeight: 800, color: color || '#122A4A' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#52607A', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ============================================================
// หน้าเข้าสู่ระบบเจ้าหน้าที่ (passcode แยก role)
// ============================================================
function StaffLogin({ onLogin }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    const role = loginStaff(code);
    if (!role) { setErr('รหัสผ่านไม่ถูกต้อง'); return; }
    onLogin(role);
  };
  return (
    <main style={{ maxWidth: 440, margin: '0 auto', padding: 'clamp(40px,8vw,80px) 20px', textAlign: 'center' }}>
      <div style={{ width: 60, height: 60, borderRadius: 15, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <DashboardIcon color="#fff" size={30} />
      </div>
      <h1 style={{ fontSize: 'clamp(22px,4vw,28px)', marginBottom: 8 }}>เข้าสู่ระบบเจ้าหน้าที่</h1>
      <p style={{ color: '#52607A', fontSize: 14.5, marginBottom: 22, lineHeight: 1.6 }}>หลังบ้านสำหรับเจ้าหน้าที่เทศบาล · ปภ. · อสม. — กรอกรหัสผ่านเฉพาะกิจของหน่วยงานคุณ</p>
      <input
        type="password" value={code} onChange={(e) => { setCode(e.target.value); setErr(''); }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="รหัสผ่านเจ้าหน้าที่" autoFocus
        style={{ width: '100%', padding: 15, border: '1.5px solid var(--line)', borderRadius: 12, fontSize: 16, textAlign: 'center', letterSpacing: 2, minHeight: 54, marginBottom: 12 }}
      />
      {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 12 }}>{err}</div>}
      <button onClick={submit} style={{ width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer', minHeight: 54 }}>เข้าสู่ระบบ</button>

      <div style={{ marginTop: 24, textAlign: 'left', background: 'var(--bg-alt)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#52607A', marginBottom: 10 }}>🔑 รหัสสำหรับสาธิต (เดโม)</div>
        {Object.values(STAFF_ROLES).map((r) => (
          <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 13, color: '#33415A' }}>{r.label}</span>
            <code style={{ fontSize: 13, fontWeight: 700, color: r.color, background: '#fff', padding: '3px 10px', borderRadius: 7, border: '1px solid var(--line)' }}>{r.passcode}</code>
          </div>
        ))}
      </div>
    </main>
  );
}

// ============================================================
// ตรวจสอบ/อนุมัติคำร้องเยียวยา (ใช้ทั้ง ปภ. และเทศบาล)
// ============================================================
function ReliefReview({ claims, setClaims, emergency }) {
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('pending');

  const setStatus = async (c, status) => {
    setBusyId(c.id);
    const ok = await updateReliefStatus(c.id, status);
    if (ok) {
      setClaims((list) => list.map((x) => (x.id === c.id ? { ...x, status } : x)));
      if (status === 'อนุมัติแล้ว' && c.phone) {
        notifyLine(c.phone, `✅ อนุมัติเงินเยียวยาแล้ว · ${c.tracking_id || c.ref}`, notifyCard({
          accent: '#8B1A10',
          badge: '🔴 อนุมัติเบิกจ่ายเยียวยา',
          bigLabel: 'เลขที่คำร้อง',
          bigValue: c.tracking_id || c.ref,
          rows: [row('สถานะ', 'อนุมัติแล้ว · ส่งเข้าระบบ e-Payment', '#0E8A5F'), row('พื้นที่', `ต.${c.subdistrict || '-'}`)],
          buttonLabel: 'ดูรายละเอียด', buttonUri: `${SITE}/relief?openExternalBrowser=1`,
        }));
      }
    }
    setBusyId(null);
  };

  const rows = useMemo(() => {
    const list = filter === 'pending' ? claims.filter((c) => !c.status || c.status === 'ยื่นคำร้องแล้ว') : claims;
    return [...list].sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
  }, [claims, filter]);

  return (
    <div>
      <p style={{ color: '#52607A', fontSize: 14.5, margin: '0 0 16px', lineHeight: 1.6 }}>
        AI คัดกรองระดับความเสียหายเบื้องต้น และจัดคิวด่วน — <b>{emergency ? 'เจ้าหน้าที่ ปภ. กดอนุมัติวงเงินฉุกเฉิน' : 'นายช่างเทศบาลเป็นผู้กดอนุมัติขั้นสุดท้าย'}</b> (Human-in-the-loop) ประชาชนไม่เห็นผล AI นี้
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['pending', 'รอตรวจสอบ'], ['all', 'ทั้งหมด']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: '9px 16px', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 42, border: filter === k ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: filter === k ? 'var(--primary-soft)' : '#fff', color: filter === k ? 'var(--primary)' : '#33415A' }}>{l}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: '#8592A3' }}>ไม่มีคำร้องในหมวดนี้</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((c) => {
            const g = String(c.ai_grade || c.grade || '2');
            const gi = GRADE[g] || GRADE['2'];
            const ai = c.ai_result || null;
            const done = c.status === 'อนุมัติแล้ว' || c.status === 'ตีกลับ';
            const photos = (c.photos_after || []).filter((u) => typeof u === 'string' && u.startsWith('http'));
            return (
              <div key={c.id} style={{ ...card, borderLeft: `4px solid ${gi.c}` }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                  <div aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 11, background: gi.c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <span style={{ fontSize: 19, fontWeight: 800 }}>{g}</span>
                  </div>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 2 }}>
                      <b style={{ color: '#122A4A', fontSize: 15.5 }}>{c.name || '—'}</b>
                      <span style={{ fontSize: 12, color: '#8592A3' }}>{c.tracking_id || c.ref}</span>
                      {c.priority != null && <span style={{ fontSize: 11.5, fontWeight: 700, color: gi.c, background: gi.bg, padding: '2px 8px', borderRadius: 100 }}>Priority {c.priority}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: '#52607A' }}>{c.address || `ต.${c.subdistrict || '-'} อ.${c.district || '-'}`}</div>
                    <div style={{ fontSize: 13, color: '#52607A' }}>ระดับน้ำ: {c.water_level || '—'} · โทร {c.phone || '—'}</div>
                    <div style={{ fontSize: 12.5, color: gi.c, fontWeight: 700, marginTop: 3 }}>AI ประเมิน: ระดับ {g} · {gi.t}{ai?.confidence ? ` · มั่นใจ ${ai.confidence}%` : ''}</div>
                    {ai?.reasons?.length > 0 && (
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#5A6883', lineHeight: 1.6 }}>
                        {ai.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                  {photos.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                      {photos.slice(0, 2).map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" style={{ width: 64, height: 64, borderRadius: 9, overflow: 'hidden', border: '1px solid var(--line)', flex: 'none' }}>
                          <img src={u} alt="หลักฐาน" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  {done ? (
                    <span style={{ fontSize: 14, fontWeight: 700, color: STATUS_C[c.status] || '#52607A' }}>
                      {c.status === 'อนุมัติแล้ว' ? '✅ อนุมัติเงินเยียวยาแล้ว (ส่งเข้าระบบ e-Payment)' : '↩ ตีกลับให้แก้ไข'}
                      <button onClick={() => setStatus(c, 'ยื่นคำร้องแล้ว')} disabled={busyId === c.id} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#8592A3', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>ยกเลิก</button>
                    </span>
                  ) : (
                    <>
                      <button onClick={() => setStatus(c, 'อนุมัติแล้ว')} disabled={busyId === c.id} style={{ background: 'var(--safe)', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 44 }}>{emergency ? '✓ อนุมัติวงเงินฉุกเฉิน' : '✓ ยืนยันอนุมัติเยียวยา'}</button>
                      <button onClick={() => setStatus(c, 'ตีกลับ')} disabled={busyId === c.id} style={{ background: '#fff', border: '1.5px solid var(--danger)', color: 'var(--danger)', padding: '11px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 44 }}>ตีกลับ</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// อนุมัติ/อัปเดตสถานะคำขอกายอุปกรณ์ (เทศบาล + อสม.)
// ============================================================
function WelfareAdmin({ welfare, setWelfare }) {
  const [busyId, setBusyId] = useState(null);

  const advance = async (r, nextStatus) => {
    setBusyId(r.id);
    const ok = await updateWelfareStatus(r.id, nextStatus, r.timeline || []);
    if (ok) {
      const newTimeline = [...(r.timeline || []), { status: nextStatus, at: new Date().toISOString() }];
      setWelfare((list) => list.map((x) => (x.id === r.id ? { ...x, status: nextStatus, timeline: newTimeline } : x)));
      if (r.phone) {
        const isReject = nextStatus === 'ตีกลับ';
        notifyLine(r.phone, `♿ อัปเดตคำขอ ${r.item_label} · ${nextStatus}`, notifyCard({
          accent: isReject ? '#D6402E' : nextStatus === 'ส่งมอบแล้ว' ? '#0E8A5F' : '#0E8390',
          badge: isReject ? '↩ คำขอถูกตีกลับ' : `♿ ${r.item_label}: ${nextStatus}`,
          rows: [row('ผู้รับสิทธิ์', r.beneficiary_name || '-'), row('สถานะล่าสุด', nextStatus, isReject ? '#D6402E' : '#0E8A5F'), row('เลขที่คำขอ', r.ref)],
          buttonLabel: 'ติดตามสถานะ', buttonUri: `${SITE}/share?tab=welfare&openExternalBrowser=1`,
        }));
      }
    }
    setBusyId(null);
  };

  const pending = welfare.filter((r) => r.status !== 'ส่งมอบแล้ว' && r.status !== 'ตีกลับ');
  const list = [...pending, ...welfare.filter((r) => r.status === 'ส่งมอบแล้ว' || r.status === 'ตีกลับ')];

  if (list.length === 0) return <div style={{ ...card, textAlign: 'center', padding: 40, color: '#8592A3' }}>ยังไม่มีคำขอกายอุปกรณ์</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {list.map((r) => {
        const idx = WELFARE_STEPS.indexOf(r.status);
        const next = idx >= 0 && idx < WELFARE_STEPS.length - 1 ? WELFARE_STEPS[idx + 1] : null;
        const closed = r.status === 'ส่งมอบแล้ว' || r.status === 'ตีกลับ';
        return (
          <div key={r.id} style={{ ...card, borderLeft: `4px solid ${closed ? (r.status === 'ตีกลับ' ? '#D6402E' : '#0E8A5F') : '#B36B00'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <b style={{ color: '#122A4A', fontSize: 15.5 }}>{r.item_label}</b>
                <span style={{ fontSize: 12, color: '#8592A3', marginLeft: 8 }}>{r.ref}</span>
                <div style={{ fontSize: 13, color: '#52607A' }}>ผู้รับสิทธิ์: {r.beneficiary_name || '—'} · โทร {r.phone}{r.by_caregiver ? ' · (อสม.ยื่นแทน)' : ''}</div>
                {r.note && <div style={{ fontSize: 12.5, color: '#8592A3', marginTop: 2 }}>📝 {r.note}</div>}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, height: 'fit-content', padding: '4px 11px', borderRadius: 100, background: closed ? (r.status === 'ตีกลับ' ? 'var(--danger-soft)' : 'var(--safe-soft)') : 'var(--amber-soft)', color: closed ? (r.status === 'ตีกลับ' ? 'var(--danger)' : 'var(--safe)') : '#B36B00' }}>{r.status}</span>
            </div>
            {!closed && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {next && <button onClick={() => advance(r, next)} disabled={busyId === r.id} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 42 }}>ปรับเป็น: {next} →</button>}
                <button onClick={() => advance(r, 'ตีกลับ')} disabled={busyId === r.id} style={{ background: '#fff', border: '1.5px solid var(--danger)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 42 }}>ตีกลับ</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// แผง อสม. — บ้านกลุ่มเปราะบาง + ยื่นเรื่องแทน
// ============================================================
function CaregiverPanel({ households, onSubmitted, showMsg }) {
  const [target, setTarget] = useState(null); // household ที่จะยื่นแทน
  const [itemKey, setItemKey] = useState('diaper');
  const [busy, setBusy] = useState(false);
  const vuln = households.filter((h) => h.vulnerable);
  const ITEMS = [
    { key: 'diaper', label: 'ผ้าอ้อมผู้ใหญ่' }, { key: 'bed', label: 'ยืมเตียงผู้ป่วย' },
    { key: 'wheelchair', label: 'รถเข็นวีลแชร์' }, { key: 'walker', label: 'ไม้เท้า/วอล์คเกอร์' }, { key: 'oxygen', label: 'เครื่องผลิตออกซิเจน' },
  ];

  const submit = async () => {
    if (!target || busy) return;
    setBusy(true);
    const ref = genRef('WF', 6);
    const item = ITEMS.find((i) => i.key === itemKey);
    await insertWelfareRequest({
      ref, phone: target.phone, householdPhone: target.phone,
      requesterName: 'อสม./ผู้ดูแลชุมชน', beneficiaryName: target.name,
      itemKey, itemLabel: item.label, byCaregiver: true,
      note: `ยื่นแทนโดย อสม. · ${(target.vulnerableTypes || []).join(', ')}`,
    });
    notifyLine(target.phone, `♿ อสม.ยื่นขอ${item.label}ให้แล้ว · ${ref}`, notifyCard({
      accent: '#0E8A5F', badge: '♿ อสม.ยื่นเรื่องให้แล้ว',
      rows: [row('รายการ', item.label), row('สถานะ', 'ยื่นคำขอ · รอพิจารณา', '#B36B00'), row('เลขที่', ref)],
      buttonLabel: 'ติดตามสถานะ', buttonUri: `${SITE}/share?tab=welfare&openExternalBrowser=1`,
    }));
    setBusy(false); setTarget(null);
    showMsg('ยื่นเรื่องแทนสำเร็จ · แจ้งเตือนเข้า LINE ของครัวเรือนแล้ว');
    onSubmitted();
  };

  if (vuln.length === 0) return <div style={{ ...card, textAlign: 'center', padding: 40, color: '#8592A3' }}>ยังไม่มีบ้านกลุ่มเปราะบางในระบบ</div>;

  return (
    <div>
      <p style={{ color: '#52607A', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>อสม./ประธานชุมชน ยื่นเรื่องรักษาสิทธิ์แทนประชาชนที่ไม่มีสมาร์ทโฟนได้ — ระบบจะแจ้งเตือนเข้า LINE ของครัวเรือน (ถ้าเชื่อมไว้)</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {vuln.map((h) => (
          <div key={h.phone} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderLeft: '4px solid var(--danger)' }}>
            <div>
              <b style={{ color: '#122A4A', fontSize: 15 }}>{h.name || 'ครัวเรือน'}</b>
              <div style={{ fontSize: 13, color: '#52607A' }}>{h.address || '-'} · โทร {h.phone}</div>
              <div style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 700, marginTop: 2 }}>🔴 {(h.vulnerableTypes || []).join(', ') || 'กลุ่มเปราะบาง'}</div>
            </div>
            <button onClick={() => { setTarget(h); setItemKey('diaper'); }} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 42 }}>ยื่นเรื่องแทน</button>
          </div>
        ))}
      </div>

      {target && (
        <div role="dialog" aria-modal="true" onClick={() => !busy && setTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,18,32,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 400, width: '100%', padding: 24 }}>
            <h3 style={{ fontSize: 19, marginBottom: 4 }}>ยื่นเรื่องแทน</h3>
            <div style={{ fontSize: 13.5, color: '#52607A', marginBottom: 16 }}>ให้ {target.name} · {target.phone}</div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#33415A', marginBottom: 6 }}>รายการที่ขอ</label>
            <select value={itemKey} onChange={(e) => setItemKey(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, minHeight: 48, marginBottom: 18, background: '#fff' }}>
              {ITEMS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setTarget(null)} style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: 13, borderRadius: 11, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', minHeight: 48 }}>ยกเลิก</button>
              <button disabled={busy} onClick={submit} style={{ flex: 1, background: 'var(--primary)', border: 'none', color: '#fff', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 48 }}>{busy ? 'กำลังยื่น…' : 'ยืนยันยื่นเรื่อง'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// แดชบอร์ดหลัก — เลือกแท็บตามสิทธิ์ของ role
// ============================================================
function Dashboard({ role, onLogout }) {
  const [claims, setClaims] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [welfare, setWelfare] = useState([]);
  const [msg, setMsg] = useState('');

  // แท็บที่ role นี้เห็น (map=บัญชาการ, relief=เยียวยา, welfare=กายอุปกรณ์, vulnerable=อสม.)
  const TAB_MAP = {
    map: { label: '🗺️ ศูนย์บัญชาการ' },
    relief: { label: role.key === 'pdd' ? '💰 อนุมัติเยียวยาฉุกเฉิน' : '💰 ตรวจสอบเยียวยา' },
    welfare: { label: '♿ คำขอกายอุปกรณ์' },
    vulnerable: { label: '🏘️ บ้านเปราะบาง (ยื่นแทน)' },
  };
  const tabKeys = role.can.filter((c) => TAB_MAP[c]);
  const [tab, setTab] = useState(tabKeys[0]);

  const loadClaims = () => fetchReliefClaims().then(setClaims);
  const loadHouseholds = () => fetchAllHouseholds().then(setHouseholds);
  const loadWelfare = () => fetchAllWelfareRequests().then(setWelfare);

  useEffect(() => {
    if (role.can.includes('map') || role.can.includes('relief') || role.can.includes('emergency')) loadClaims();
    if (role.can.includes('map') || role.can.includes('vulnerable')) loadHouseholds();
    if (role.can.includes('welfare')) loadWelfare();
    // eslint-disable-next-line
  }, []);

  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2600); return () => clearTimeout(t); }, [msg]);

  const reliefStats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => !c.status || c.status === 'ยื่นคำร้องแล้ว').length;
    const approved = claims.filter((c) => c.status === 'อนุมัติแล้ว').length;
    const urgent = claims.filter((c) => ['3', '4'].includes(String(c.ai_grade || c.grade))).length;
    return { total, pending, approved, urgent };
  }, [claims]);
  const vulnCount = households.filter((h) => h.vulnerable).length;

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(18px,4vw,36px) 16px 72px' }}>
      {/* หัว */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <DashboardIcon color="#fff" size={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(20px,3.4vw,27px)' }}>Dashboard · {role.label}</h1>
          <div style={{ fontSize: 12.5, color: '#52607A' }}>{role.desc}</div>
        </div>
        <button onClick={onLogout} style={{ background: '#fff', border: '1px solid var(--line)', color: '#52607A', padding: '9px 15px', borderRadius: 10, fontSize: 13.5, cursor: 'pointer', minHeight: 42 }}>ออกจากระบบ</button>
      </div>

      {msg && <div style={{ background: 'var(--safe-soft)', color: 'var(--safe)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, margin: '10px 0' }}>{msg}</div>}

      {/* แท็บ */}
      {tabKeys.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 18px' }}>
          {tabKeys.map((k) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 16px', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44, border: tab === k ? `1.5px solid ${role.color}` : '1.5px solid var(--line)', background: tab === k ? role.color : '#fff', color: tab === k ? '#fff' : '#33415A' }}>{TAB_MAP[k].label}</button>
          ))}
        </div>
      )}

      {/* ===== ศูนย์บัญชาการ (แผนที่) ===== */}
      {tab === 'map' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat label="ครัวเรือนในระบบ" value={households.length} />
            <Stat label="บ้านกลุ่มเปราะบาง" value={vulnCount} color="#D6402E" />
            <Stat label="เคสเยียวยาทั้งหมด" value={reliefStats.total} />
            <Stat label="เคสหนัก/สิ้นเชิง" value={reliefStats.urgent} color="#8B1A10" />
          </div>
          <div style={{ ...card, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <b style={{ fontSize: 15, color: '#122A4A' }}>แผนที่ความเสี่ยง Real-time</b>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#52607A', flexWrap: 'wrap' }}>
                <span>🔴 บ้านกลุ่มเปราะบาง</span><span>🟢 ครัวเรือนทั่วไป</span><span>📍 เคสเยียวยา</span>
              </div>
            </div>
            <HouseholdMap households={households} claims={claims} height={420} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={() => { loadHouseholds(); loadClaims(); setMsg('รีเฟรชข้อมูลแผนที่แล้ว'); }} style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1.5px solid var(--primary)', padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 42 }}>🔄 รีเฟรชแผนที่</button>
            </div>
          </div>
          {vulnCount > 0 && (
            <div style={{ ...card, marginTop: 14 }}>
              <b style={{ fontSize: 15, color: '#122A4A' }}>🔴 บ้านกลุ่มเปราะบาง (ส่งทีมอพยพก่อน)</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {households.filter((h) => h.vulnerable).map((h) => (
                  <div key={h.phone} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, padding: '8px 0', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
                    <span><b>{h.name || 'ครัวเรือน'}</b> · {h.address || '-'}</span>
                    <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{(h.vulnerableTypes || []).join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== เยียวยา ===== */}
      {tab === 'relief' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <Stat label="คำร้องทั้งหมด" value={reliefStats.total} />
            <Stat label="รอตรวจสอบ" value={reliefStats.pending} color="#B36B00" />
            <Stat label="อนุมัติแล้ว" value={reliefStats.approved} color="#0E8A5F" />
            <Stat label="เคสหนัก/สิ้นเชิง (AI)" value={reliefStats.urgent} color="#C0362E" />
          </div>
          <ReliefReview claims={claims} setClaims={setClaims} emergency={role.key === 'pdd'} />
        </div>
      )}

      {/* ===== กายอุปกรณ์ ===== */}
      {tab === 'welfare' && (
        <div>
          <p style={{ color: '#52607A', fontSize: 14.5, margin: '0 0 16px', lineHeight: 1.6 }}>อนุมัติและติดตามการจัดส่งกายอุปกรณ์/สวัสดิการกลุ่มเปราะบาง — ทุกครั้งที่ปรับสถานะ ระบบจะแจ้งเตือนเข้า LINE ประชาชนแบบติดตามพัสดุ</p>
          <WelfareAdmin welfare={welfare} setWelfare={setWelfare} />
        </div>
      )}

      {/* ===== อสม. บ้านเปราะบาง ===== */}
      {tab === 'vulnerable' && (
        <CaregiverPanel households={households} onSubmitted={loadWelfare} showMsg={setMsg} />
      )}
    </main>
  );
}

export default function Staff() {
  const [role, setRole] = useState(readStaffRole);
  if (!role) return <StaffLogin onLogin={setRole} />;
  return <Dashboard role={role} onLogout={() => { logoutStaff(); setRole(null); }} />;
}
