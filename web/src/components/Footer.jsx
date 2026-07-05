import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer id="contact" style={{ borderTop: '1px solid var(--line)', background: '#fff', padding: '52px 20px 36px', marginTop: 8 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 260px', maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
            <BrandLogo size={40} />
            <span style={{ fontFamily: "'IBM Plex Sans Thai'", fontWeight: 700, fontSize: 18, color: 'var(--primary)' }}>Yala Household</span>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#52607A', margin: '0 0 16px' }}>
            บริการครัวเรือนดิจิทัลผ่าน LINE Official Account เพื่อประชาชนเทศบาลนครยะลา
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={64} />
            <span style={{ fontSize: 13, color: '#52607A', lineHeight: 1.5 }}>ตราสัญลักษณ์<br />เทศบาลนครยะลา</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#122A4A', marginBottom: 14 }}>บริการ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14.5 }}>
              <Link to="/mind-talk" style={footerLinkStyle}>คุยกับใจ</Link>
              <Link to="/share" style={footerLinkStyle}>ศูนย์แบ่งปัน</Link>
              <Link to="/relief" style={footerLinkStyle}>เงินเยียวยา</Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#122A4A', marginBottom: 14 }}>ติดต่อ (ตัวอย่าง)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14.5, color: '#52607A' }}>
              <span>เทศบาลนครยะลา ถ.สุขยางค์</span>
              <span>โทร 0-73xx-xxxx</span>
              <span>อีเมล hello@yalaheal.example</span>
              <span>สายด่วน 199 · สุขภาพจิต 1323</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: '32px auto 0', paddingTop: 22, borderTop: '1px solid var(--line)', fontSize: 13, color: '#8592A3', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
        <span>© 2569 Yala Household · เว็บไซต์ต้นแบบเพื่อการนำเสนอ (ข้อมูลตัวอย่าง)</span>
        <span>ออกแบบเพื่อประชาชนเทศบาลนครยะลา</span>
      </div>
    </footer>
  );
}

const footerLinkStyle = { background: 'none', border: 'none', padding: 0, textAlign: 'left', color: '#52607A', cursor: 'pointer', textDecoration: 'none' };
