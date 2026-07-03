import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PHONE_RE, genRef, scrollTop } from '../lib/helpers';
import { ShareIcon } from '../components/Icons';

const TAB_DEFS = [{ k: 'all', l: 'ทั้งหมด' }, { k: 'need', l: 'ต้องการ' }, { k: 'give', l: 'แบ่งปัน' }, { k: 'gig', l: 'อาสา' }];
const NEW_TYPES = [{ k: 'need', l: 'ขอ/ต้องการ' }, { k: 'give', l: 'มี/แบ่งปัน' }, { k: 'gig', l: 'หาอาสา' }];

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

const card = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(22px,3vw,30px)', boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 10, fontSize: 16, color: '#122A4A', minHeight: 48 };
const label = { display: 'block', fontSize: 14, fontWeight: 600, color: '#33415A', marginBottom: 6 };
const tabBtn = (on) => ({ cursor: 'pointer', padding: '10px 18px', borderRadius: 100, fontSize: 14.5, fontWeight: 600, minHeight: 44, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary)' : '#fff', color: on ? '#fff' : '#33415A' });
const optBtn = (on) => ({ cursor: 'pointer', padding: '11px 16px', borderRadius: 11, fontSize: 14.5, fontWeight: 600, minHeight: 46, fontFamily: 'inherit', border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', background: on ? 'var(--primary-soft)' : '#fff', color: on ? 'var(--primary)' : '#33415A' });

const emptyRequestForm = { name: '', phone: '', qty: '', note: '', err: '' };
const emptyNewForm = { type: 'need', name: '', qty: '', zone: '', note: '', err: '' };

export default function Share() {
  const navigate = useNavigate();
  const { donations, addDonation, showToast } = useApp();

  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');
  const [sel, setSel] = useState(null);
  const [reqForm, setReqForm] = useState(emptyRequestForm);
  const [submitting, setSubmitting] = useState(false);
  const [newForm, setNewForm] = useState(emptyNewForm);
  const [ref, setRef] = useState('');
  const [doneMode, setDoneMode] = useState('request');

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
    setTimeout(() => {
      setSubmitting(false);
      setRef(newRef);
      setDoneMode(sel?.type === 'give' ? 'request' : sel?.type === 'gig' ? 'gig' : 'offer');
      setView('done');
      scrollTop();
    }, 700);
  };

  const submitNew = () => {
    if (!newForm.name.trim()) { setNewForm((f) => ({ ...f, err: 'กรุณากรอกชื่อสิ่งของหรืองาน' })); return; }
    const item = { type: newForm.type, name: newForm.name, qty: newForm.qty || '-', zone: newForm.zone || 'ไม่ระบุพื้นที่', note: newForm.note || 'ประกาศใหม่' };
    addDonation(item);
    setView('list'); setTab('all'); scrollTop();
    showToast('เผยแพร่ประกาศเรียบร้อยแล้ว');
  };

  const filtered = donations.filter((d) => tab === 'all' || d.type === tab);
  const selBadge = sel ? badgeFor(sel.type) : { text: '', bg: '', color: '' };
  const shareFormTitle = sel ? (sel.type === 'give' ? 'กรอกข้อมูลเพื่อขอรับ' : sel.type === 'gig' ? 'กรอกข้อมูลเพื่อสมัครอาสา' : 'กรอกข้อมูลเพื่อแจ้งว่ามีให้') : '';
  const shareSubmitLabel = sel ? (sel.type === 'give' ? 'ยืนยันขอรับ (ตรวจสอบโควตา ThaID)' : sel.type === 'gig' ? 'ยืนยันสมัครอาสา' : 'ยืนยันการแจ้ง') : 'ยืนยัน';
  const shareDoneMsg = doneMode === 'request' ? 'บันทึกคำขอรับเรียบร้อย ระบบตรวจสอบโควตา ThaID และจับคู่ผู้ให้แล้ว' : doneMode === 'gig' ? 'สมัครอาสาเรียบร้อย ผู้ประสานงานจะติดต่อกลับ' : 'บันทึกข้อมูลเรียบร้อย ขอบคุณสำหรับน้ำใจแบ่งปัน';

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShareIcon color="var(--primary)" size={24} />
          </span>
          <h1 style={{ fontSize: 'clamp(24px,3.6vw,32px)' }}>ศูนย์แบ่งปันเหลือ-ขาด</h1>
        </div>
        {view === 'list' && <button onClick={openNew} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: 'pointer', minHeight: 46 }}>+ ลงประกาศใหม่</button>}
      </div>

      {view === 'list' && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 20px' }}>
            {TAB_DEFS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} style={tabBtn(tab === t.k)}>{t.l}</button>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {filtered.map((d) => {
              const b = badgeFor(d.type);
              return (
                <div key={d.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(16,24,40,.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        </div>
      )}

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
                : <button onClick={submitRequest} style={{ width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: 'pointer', minHeight: 50 }}>{shareSubmitLabel}</button>}
            </div>
          </div>
        </div>
      )}

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
            <button onClick={submitNew} style={{ width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', padding: 15, borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: 'pointer', minHeight: 50 }}>เผยแพร่ประกาศ</button>
          </div>
        </div>
      )}

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
    </main>
  );
}
