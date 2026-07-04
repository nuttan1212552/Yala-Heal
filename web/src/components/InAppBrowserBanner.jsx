import { useState } from 'react';

// ตรวจว่ากำลังเปิดในเว็บวิวของแอป LINE หรือไม่ (User-Agent มีคำว่า "Line/")
function isLineInApp() {
  return typeof navigator !== 'undefined' && /\bLine\//i.test(navigator.userAgent || '');
}

// แถบเตือนเมื่อเปิดในแอป LINE — การแนบรูป/ถ่ายรูปมักไม่ทำงานในเว็บวิว LINE
// ช่วยให้ผู้ใช้เด้งออกไปเปิดในเบราว์เซอร์จริง (Chrome/Safari)
export default function InAppBrowserBanner() {
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  if (hidden || !isLineInApp()) return null;

  const openExternal = () => {
    const base = window.location.href.split('#')[0];
    // พารามิเตอร์มาตรฐานของ LINE เพื่อสั่งเปิดเบราว์เซอร์ภายนอก
    window.location.href = base + (base.includes('?') ? '&' : '?') + 'openExternalBrowser=1';
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* บางเว็บวิวไม่รองรับ clipboard */ }
  };

  return (
    <div style={{ background: '#FFF7EC', borderBottom: '1px solid var(--amber-soft)', padding: '10px 16px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ fontSize: 18 }}>🌐</span>
        <div style={{ flex: 1, minWidth: 180, fontSize: 13.5, color: '#7A4A00', lineHeight: 1.5 }}>
          <b style={{ color: '#8A5200' }}>กำลังเปิดในแอป LINE</b> — การแนบรูป/ถ่ายรูปอาจไม่ทำงาน แนะนำเปิดในเบราว์เซอร์ (Chrome/Safari)
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={openExternal} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: 9, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', minHeight: 40 }}>เปิดในเบราว์เซอร์</button>
          <button type="button" onClick={copyLink} style={{ background: '#fff', border: '1.5px solid var(--line)', color: '#33415A', padding: '9px 14px', borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', minHeight: 40 }}>{copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}</button>
          <button type="button" onClick={() => setHidden(true)} aria-label="ปิด" style={{ background: 'none', border: 'none', color: '#8592A3', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: '4px auto 0', fontSize: 12, color: '#9A6A2A', lineHeight: 1.5 }}>
        ถ้าไม่เด้งออก: แตะปุ่ม <b>⋯</b> มุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์อื่น" (Open in other browser)
      </div>
    </div>
  );
}
