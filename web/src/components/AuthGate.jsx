import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// ประตูควบคุมการเข้าถึง (ตาม PDF: ระบบฝังใน LINE OA — ต้องยืนยันตัวตนก่อน แล้วบังคับลงทะเบียนครัวเรือน)
// - /staff = พอร์ทัลเจ้าหน้าที่ ยกเว้นไม่ต้องผ่านประตูประชาชน
// - ยังไม่ล็อกอิน → หน้าเข้าสู่ระบบ LINE
// - ล็อกอินแล้วแต่ยังไม่ลงทะเบียนบ้าน → เด้งไป onboarding ทันที
export default function AuthGate() {
  const { loggedIn, authReady, onboarded, householdReady, login } = useApp();
  const location = useLocation();
  const path = location.pathname;

  // พอร์ทัลเจ้าหน้าที่เทศบาล — เข้าได้เลย (คนละกลุ่มผู้ใช้กับประชาชน)
  if (path.startsWith('/staff')) return <Outlet />;

  // รอโหลดสถานะล็อกอิน + ข้อมูลบ้าน ก่อนตัดสินใจ (กันจอกระพริบ/เด้งวน)
  if (!authReady || (loggedIn && !householdReady)) {
    return (
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div aria-hidden="true" style={{ width: 40, height: 40, border: '4px solid #C9D9F5', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </main>
    );
  }

  // ยังไม่ล็อกอิน → หน้าเข้าสู่ระบบด้วย LINE
  if (!loggedIn) {
    return (
      <main style={{ maxWidth: 480, margin: '0 auto', padding: 'clamp(40px,8vw,80px) 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🏡</div>
        <h1 style={{ fontSize: 'clamp(24px,4vw,30px)', marginBottom: 10 }}>สำมะโนครัวดิจิทัล & รักษาสิทธิ์เมือง</h1>
        <p style={{ color: '#52607A', fontSize: 15.5, lineHeight: 1.6, marginBottom: 26 }}>
          บริการของเทศบาลนครยะลา — เช็คบิลค่าน้ำ/ขยะ/ภาษี ติดตามสิทธิ์สวัสดิการ และรับเงินเยียวยาภัยพิบัติในที่เดียว เข้าสู่ระบบด้วย LINE เพื่อเริ่มใช้งาน
        </p>
        <button onClick={login} style={{ width: '100%', background: '#06C755', color: '#fff', border: 'none', padding: 16, borderRadius: 12, fontWeight: 700, fontSize: 16.5, cursor: 'pointer', minHeight: 54, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>💬</span> เข้าสู่ระบบด้วย LINE
        </button>
        <div style={{ fontSize: 12.5, color: '#8592A3', marginTop: 12 }}>ปลอดภัย · เราเห็นแค่ชื่อและรูปโปรไฟล์ LINE ของคุณ</div>
      </main>
    );
  }

  // ล็อกอินแล้วแต่ยังไม่ลงทะเบียนบ้าน → บังคับ onboarding (ยกเว้นตอนอยู่หน้า onboarding เอง)
  if (!onboarded && path !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
