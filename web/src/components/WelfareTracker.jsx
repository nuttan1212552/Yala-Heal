import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { genRef } from '../lib/helpers';
import { insertWelfareRequest, fetchWelfareRequests, notifyLine } from '../lib/db';
import { notifyCard, row, SITE } from '../lib/flex';

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(18px,3vw,24px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };

const ITEMS = [
  { key: 'diaper', icon: '🧷', label: 'ผ้าอ้อมผู้ใหญ่', sub: 'ขอรับสนับสนุนรายเดือน' },
  { key: 'bed', icon: '🛏️', label: 'ยืมเตียงผู้ป่วย', sub: 'ยืมใช้ระหว่างพักฟื้นที่บ้าน' },
  { key: 'wheelchair', icon: '♿', label: 'รถเข็นวีลแชร์', sub: 'ยืม/ขอรับสำหรับผู้เดินไม่ได้' },
  { key: 'walker', icon: '🦯', label: 'ไม้เท้า / วอล์คเกอร์', sub: 'ช่วยพยุงเดิน' },
  { key: 'oxygen', icon: '🫁', label: 'เครื่องผลิตออกซิเจน', sub: 'สำหรับผู้ป่วยระบบทางเดินหายใจ' },
];

// ขั้นตอนสถานะ (แบบติดตามพัสดุ)
const WSTEPS = ['ยื่นคำขอ', 'อนุมัติ', 'อยู่ระหว่างจัดส่ง', 'ส่งมอบแล้ว'];
const itemLabel = (k) => ITEMS.find((i) => i.key === k)?.label || k;

function StatusTrack({ status, timeline }) {
  const rejected = status === 'ตีกลับ';
  const activeIdx = rejected ? -1 : WSTEPS.indexOf(status);
  const atMap = {};
  (timeline || []).forEach((t) => { atMap[t.status] = t.at; });
  if (rejected) {
    return <div style={{ marginTop: 10, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700 }}>↩ คำขอถูกตีกลับ — โปรดติดต่อ อสม./เทศบาลเพื่อยื่นใหม่</div>;
  }
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {WSTEPS.map((s, i) => {
        const done = i <= activeIdx;
        const current = i === activeIdx;
        return (
          <div key={s} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: done ? 'var(--safe)' : '#fff', border: `2px solid ${done ? 'var(--safe)' : '#CBD3DD'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>{done ? '✓' : ''}</span>
              {i < WSTEPS.length - 1 && <span style={{ width: 2, height: 22, background: i < activeIdx ? 'var(--safe)' : '#E3E8EF' }} />}
            </div>
            <div style={{ paddingBottom: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: current ? 700 : 600, color: done ? '#122A4A' : '#8592A3' }}>{s}{current ? ' · ขั้นตอนปัจจุบัน' : ''}</div>
              {atMap[s] && <div style={{ fontSize: 11, color: '#8592A3' }}>{new Date(atMap[s]).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function WelfareTracker() {
  const { household, profile, members, showToast } = useApp();
  const phone = household?.phone || profile?.phone || '';
  const vulnMembers = (members || []).filter((m) => (m.vulnerableTypes || []).length > 0);

  const [list, setList] = useState(null);
  const [item, setItem] = useState(null);              // item กำลังขอ
  const [beneficiary, setBeneficiary] = useState(vulnMembers[0]?.fullName || household?.name || '');
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const load = () => { if (phone) fetchWelfareRequests(phone).then(setList); else setList([]); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [phone]);

  const openReq = (it) => { setItem(it); setConsent(false); setNote(''); setErr(''); setBeneficiary(vulnMembers[0]?.fullName || household?.name || ''); };

  const submit = async () => {
    if (submitting) return;
    if (!beneficiary.trim()) { setErr('กรุณาเลือก/ระบุผู้รับสิทธิ์'); return; }
    if (!consent) { setErr('กรุณายอมรับการเปิดเผยข้อมูลสุขภาพแก่เจ้าหน้าที่เพื่อพิจารณาสิทธิ์ก่อน'); return; }
    setSubmitting(true);
    const ref = genRef('WF', 6);
    const saved = await insertWelfareRequest({
      ref, phone, householdPhone: phone,
      requesterName: household?.name || profile?.name,
      beneficiaryName: beneficiary.trim(),
      itemKey: item.key, itemLabel: item.label, note: note.trim(),
      byCaregiver: false,
    });
    notifyLine(phone, `♿ รับคำขอ${item.label}แล้ว · เลขที่ ${ref}`, notifyCard({
      accent: '#0E8A5F',
      badge: '♿ รับคำขอสิทธิ์แล้ว',
      bigLabel: 'เลขที่คำขอ',
      bigValue: ref,
      rows: [
        row('รายการ', item.label),
        row('ผู้รับสิทธิ์', beneficiary.trim()),
        row('สถานะ', 'ยื่นคำขอ · รอเจ้าหน้าที่พิจารณา', '#B36B00'),
      ],
      buttonLabel: 'ติดตามสถานะ',
      buttonUri: `${SITE}/share?tab=welfare&openExternalBrowser=1`,
    }));
    setSubmitting(false);
    setItem(null);
    setList((l) => [saved, ...(l || [])]);
    showToast('ส่งคำขอเรียบร้อย · ติดตามสถานะได้ทาง LINE 📦');
  };

  return (
    <div>
      <div style={{ background: 'linear-gradient(180deg,#fff,#FDF3F2)', border: '1px solid var(--danger-soft)', borderRadius: 14, padding: '16px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>♿</span>
          <b style={{ color: '#122A4A', fontSize: 15.5 }}>รักษาสิทธิ์กายอุปกรณ์ (กลุ่มเปราะบาง)</b>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: '#41506B', lineHeight: 1.65 }}>
          ขอรับผ้าอ้อมผู้ใหญ่ ยืมเตียงผู้ป่วย หรือกายอุปกรณ์อื่น ๆ สำหรับสมาชิกกลุ่มเปราะบางในบ้าน — เมื่อยื่นแล้ว <b>อสม.</b> จะรับเรื่องและจัดส่ง คุณติดตามสถานะได้เหมือนติดตามพัสดุ พร้อมแจ้งเตือนทาง LINE ทุกขั้นตอน
        </p>
      </div>

      {/* รายการที่ขอได้ */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>เลือกสิ่งที่ต้องการขอรับ</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 24 }}>
        {ITEMS.map((it) => (
          <button key={it.key} onClick={() => openReq(it)} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16 }}>
            <span aria-hidden="true" style={{ fontSize: 26, flex: 'none' }}>{it.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15 }}>{it.label}</div>
              <div style={{ fontSize: 12.5, color: '#52607A', lineHeight: 1.5 }}>{it.sub}</div>
              <div style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 700, marginTop: 4 }}>ขอรับ →</div>
            </div>
          </button>
        ))}
      </div>

      {/* รายการคำขอของฉัน */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>คำขอของฉัน</div>
      {list === null ? (
        <div style={{ ...card, textAlign: 'center', color: '#8592A3' }}>กำลังโหลด…</div>
      ) : list.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#8592A3', padding: 30 }}>ยังไม่มีคำขอ — เลือกจากรายการด้านบนเพื่อยื่นได้เลย</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((r) => (
            <div key={r.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#122A4A', fontSize: 15.5 }}>{r.item_label || itemLabel(r.item_key)}</div>
                  <div style={{ fontSize: 12.5, color: '#52607A' }}>ผู้รับสิทธิ์: {r.beneficiary_name || '—'} · {r.ref}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 100, background: r.status === 'ส่งมอบแล้ว' ? 'var(--safe-soft)' : r.status === 'ตีกลับ' ? 'var(--danger-soft)' : 'var(--amber-soft)', color: r.status === 'ส่งมอบแล้ว' ? 'var(--safe)' : r.status === 'ตีกลับ' ? 'var(--danger)' : '#B36B00' }}>{r.status}</span>
              </div>
              <StatusTrack status={r.status} timeline={r.timeline} />
            </div>
          ))}
        </div>
      )}

      {/* Modal ยื่นคำขอ */}
      {item && (
        <div role="dialog" aria-modal="true" onClick={() => !submitting && setItem(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,18,32,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 420, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 28 }}>{item.icon}</span>
              <h3 style={{ fontSize: 19 }}>ขอรับ · {item.label}</h3>
            </div>

            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#33415A', marginBottom: 6 }}>ผู้รับสิทธิ์ (สมาชิกกลุ่มเปราะบาง)</label>
            {vulnMembers.length > 0 ? (
              <select value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, minHeight: 48, marginBottom: 14, background: '#fff' }}>
                {vulnMembers.map((m) => <option key={m.fullName} value={m.fullName}>{m.fullName} · {(m.vulnerableTypes || []).join(', ')}</option>)}
              </select>
            ) : (
              <input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="ชื่อผู้รับสิทธิ์" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, minHeight: 48, marginBottom: 14 }} />
            )}

            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#33415A', marginBottom: 6 }}>หมายเหตุ (อาการ/ความจำเป็น)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="เช่น ผู้ป่วยติดเตียง ต้องเปลี่ยนผ้าอ้อมวันละ 3 ครั้ง" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 15, minHeight: 60, resize: 'vertical', marginBottom: 14 }} />

            <button onClick={() => setConsent(!consent)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '12px 14px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, border: consent ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: consent ? 'var(--primary-soft)' : '#fff', color: consent ? 'var(--primary)' : '#33415A', marginBottom: 14, lineHeight: 1.5 }}>
              <span aria-hidden="true">{consent ? '☑' : '☐'}</span> ยินยอมเปิดเผยข้อมูลสุขภาพของผู้รับสิทธิ์ให้ อสม./เจ้าหน้าที่ เพื่อพิจารณาและจัดส่งกายอุปกรณ์
            </button>

            {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13.5, marginBottom: 10 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setItem(null)} style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#26344C', padding: 13, borderRadius: 11, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', minHeight: 48 }}>ยกเลิก</button>
              <button disabled={submitting} onClick={submit} style={{ flex: 1, background: 'var(--primary)', border: 'none', color: '#fff', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', minHeight: 48 }}>{submitting ? 'กำลังส่ง…' : 'ยืนยันยื่นคำขอ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
