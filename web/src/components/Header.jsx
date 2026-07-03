import { Link, useLocation, useNavigate } from 'react-router-dom';

const TITLES = {
  '/sos': 'SOS แจ้งเหตุฉุกเฉิน',
  '/mind-talk': 'คุยกับใจ',
  '/share': 'ศูนย์แบ่งปัน',
  '/relief': 'ระบบเงินเยียวยา',
  '/dashboard': 'Dashboard เทศบาล',
};

function LogoMark({ size = 42, inner = 17, thick = 4 }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flex: 'none' }}
    >
      <span style={{ position: 'absolute', width: inner, height: thick, borderRadius: 3, background: '#fff' }} />
      <span style={{ position: 'absolute', width: thick, height: inner, borderRadius: 3, background: '#fff' }} />
    </span>
  );
}

export default function Header({ navOpen, toggleNav }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const headerTitle = TITLES[location.pathname] || '';

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 60, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', height: 72, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button
            onClick={() => navigate('/')}
            aria-label="กลับหน้าแรก Yala Heal"
            style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0 }}
          >
            <LogoMark />
            <span style={{ lineHeight: 1.1, textAlign: 'left' }}>
              <span style={{ display: 'block', fontFamily: "'IBM Plex Sans Thai'", fontWeight: 700, fontSize: 19, color: 'var(--primary)' }}>Yala Heal</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>ระบบผู้ช่วยยามภัยพิบัติ</span>
            </span>
          </button>
          {!isHome && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 14, borderLeft: '1px solid var(--line)' }}>
              <button
                onClick={() => navigate('/')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 10, padding: '10px 16px', fontSize: 14.5, fontWeight: 700, color: '#fff', cursor: 'pointer', minHeight: 42, boxShadow: '0 2px 8px rgba(18,42,74,.22)' }}
              >
                <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>←</span> หน้าแรก
              </button>
              <span className="nav-desk" style={{ fontWeight: 600, color: '#122A4A', fontSize: 15 }}>{headerTitle}</span>
            </div>
          )}
        </div>
        {isHome && (
          <div className="nav-desk" style={{ alignItems: 'center', gap: 26, fontSize: 15.5, fontWeight: 500 }}>
            <a href="#features" style={{ textDecoration: 'none', color: '#33415A' }}>บริการ</a>
            <a href="#security" style={{ textDecoration: 'none', color: '#33415A' }}>ความปลอดภัย</a>
            <a href="#roadmap" style={{ textDecoration: 'none', color: '#33415A' }}>Roadmap</a>
            <a href="#contact" style={{ textDecoration: 'none', color: '#33415A' }}>ติดต่อ</a>
            <button
              onClick={() => navigate('/sos')}
              style={{ color: '#fff', background: 'var(--danger)', padding: '11px 18px', borderRadius: 9, fontWeight: 700, border: 'none', cursor: 'pointer', minHeight: 44, fontSize: 15 }}
            >
              แจ้งเหตุด่วน
            </button>
          </div>
        )}
        <button
          className="nav-burger"
          onClick={toggleNav}
          aria-label="เปิดเมนู"
          style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: 11, cursor: 'pointer', flexDirection: 'column', gap: 4, flex: 'none' }}
        >
          <span aria-hidden="true" style={{ width: 19, height: 2, background: 'var(--primary)', borderRadius: 2 }} />
          <span aria-hidden="true" style={{ width: 19, height: 2, background: 'var(--primary)', borderRadius: 2 }} />
          <span aria-hidden="true" style={{ width: 19, height: 2, background: 'var(--primary)', borderRadius: 2 }} />
        </button>
      </div>
      {navOpen && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '10px 16px 18px', display: 'flex', flexDirection: 'column', gap: 2, background: '#fff' }}>
          <Link to="/sos" style={navItemStyle}>แจ้งเหตุฉุกเฉิน</Link>
          <Link to="/mind-talk" style={navItemStyle}>คุยกับใจ</Link>
          <Link to="/share" style={navItemStyle}>ศูนย์แบ่งปัน</Link>
          <Link to="/relief" style={navItemStyle}>เงินเยียวยา</Link>
          <Link to="/dashboard" style={navItemStyle}>Dashboard เจ้าหน้าที่</Link>
        </div>
      )}
    </header>
  );
}

const navItemStyle = {
  textAlign: 'left',
  background: 'none',
  border: 'none',
  color: '#26344C',
  padding: '14px 10px',
  borderRadius: 9,
  fontSize: 17,
  minHeight: 44,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'block',
};
