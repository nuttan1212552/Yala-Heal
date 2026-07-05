import { useEffect, useMemo, useState } from 'react';
import { fetchReliefClaims, updateReliefStatus } from '../lib/db';
import { DashboardIcon } from '../components/Icons';

// สี/ชื่อระดับความเสียหาย (ตามเกณฑ์ ปภ.)
const GRADE = {
  '1': { c: '#0E8A5F', bg: 'rgba(14,138,95,.12)', t: 'เล็กน้อย' },
  '2': { c: '#B36B00', bg: 'rgba(179,107,0,.12)', t: 'ปานกลาง' },
  '3': { c: '#C0362E', bg: 'rgba(192,54,46,.1)', t: 'หนัก' },
  '4': { c: '#8B1A10', bg: 'rgba(139,26,16,.1)', t: 'สิ้นเชิง' },
};
const STATUS_C = { 'อนุมัติแล้ว': '#0E8A5F', 'ตีกลับ': '#C0362E' };

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(16,24,40,.05)' };

function Stat({ label, value, color }) {
  return (
    <div style={{ ...card, flex: '1 1 120px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 30, fontWeight: 800, color: color || '#122A4A' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#52607A', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Staff() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending | all

  useEffect(() => {
    let alive = true;
    fetchReliefClaims().then((rows) => { if (alive) { setClaims(rows); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const setStatus = async (id, status) => {
    setBusyId(id);
    const ok = await updateReliefStatus(id, status);
    if (ok) setClaims((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));
    setBusyId(null);
  };

  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => !c.status || c.status === 'ยื่นคำร้องแล้ว').length;
    const approved = claims.filter((c) => c.status === 'อนุมัติแล้ว').length;
    const urgent = claims.filter((c) => String(c.ai_grade || c.grade) === '4' || String(c.ai_grade || c.grade) === '3').length;
    return { total, pending, approved, urgent };
  }, [claims]);

  // เรียงตาม priority (ด่วนสุดขึ้นก่อน) แล้วตามเวลาล่าสุด
  const rows = useMemo(() => {
    const list = filter === 'pending' ? claims.filter((c) => !c.status || c.status === 'ยื่นคำร้องแล้ว') : claims;
    return [...list].sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
  }, [claims, filter]);

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(20px,4vw,40px) 20px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DashboardIcon color="#fff" size={22} />
        </span>
        <h1 style={{ fontSize: 'clamp(23px,3.6vw,30px)' }}>Dashboard เจ้าหน้าที่ · ตรวจสอบคำร้องเยียวยา</h1>
      </div>
      <p style={{ color: '#52607A', fontSize: 14.5, margin: '0 0 20px', lineHeight: 1.6 }}>
        AI คัดกรองระดับความเสียหายเบื้องต้น (Pre-screening) และจัดคิวด่วน — <b>นายช่างเทศบาลเป็นผู้กดอนุมัติขั้นสุดท้ายเสมอ</b> (Human-in-the-loop) ประชาชนจะไม่เห็นผล AI นี้
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <Stat label="คำร้องทั้งหมด" value={stats.total} />
        <Stat label="รอตรวจสอบ" value={stats.pending} color="#B36B00" />
        <Stat label="อนุมัติแล้ว" value={stats.approved} color="#0E8A5F" />
        <Stat label="เคสหนัก/สิ้นเชิง (AI)" value={stats.urgent} color="#C0362E" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['pending', 'รอตรวจสอบ'], ['all', 'ทั้งหมด']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: '9px 16px', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 42, border: filter === k ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: filter === k ? 'var(--primary-soft)' : '#fff', color: filter === k ? 'var(--primary)' : '#33415A' }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: '#8592A3' }}>กำลังโหลดคำร้อง…</div>
      ) : rows.length === 0 ? (
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
                  <div aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 11, background: gi.c, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 'none', lineHeight: 1 }}>
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
                      <button onClick={() => setStatus(c.id, 'ยื่นคำร้องแล้ว')} disabled={busyId === c.id} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#8592A3', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>ยกเลิก</button>
                    </span>
                  ) : (
                    <>
                      <button onClick={() => setStatus(c.id, 'อนุมัติแล้ว')} disabled={busyId === c.id} style={{ background: 'var(--safe)', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 44 }}>✓ ยืนยันอนุมัติเยียวยา</button>
                      <button onClick={() => setStatus(c.id, 'ตีกลับ')} disabled={busyId === c.id} style={{ background: '#fff', border: '1.5px solid var(--danger)', color: 'var(--danger)', padding: '11px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 44 }}>ตีกลับ</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
