import { useNavigate } from 'react-router-dom';
import { MindIcon, ShareIcon, ReliefIcon, DashboardIcon } from '../components/Icons';
import ProfileCard from '../components/ProfileCard';
import { useApp } from '../context/AppContext';

// การ์ดฟีเจอร์ใหญ่ (เน้นมือถือ — กดง่าย เต็มความกว้าง)
function FeatureRow({ emoji, icon, title, sub, onClick, accent = 'var(--primary)', soft = 'var(--primary-soft)', tag }) {
  return (
    <button onClick={onClick} className="yh-card" style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
      background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 3px rgba(16,24,40,.05)',
    }}>
      <span aria-hidden="true" style={{ width: 50, height: 50, borderRadius: 13, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 24 }}>
        {icon || emoji}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#122A4A' }}>{title}</span>
          {tag && <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: soft, padding: '2px 8px', borderRadius: 100 }}>{tag}</span>}
        </div>
        <div style={{ fontSize: 13.5, color: '#52607A', lineHeight: 1.5 }}>{sub}</div>
      </div>
      <span aria-hidden="true" style={{ color: accent, fontWeight: 700, fontSize: 20, flex: 'none' }}>→</span>
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { household, hasVulnerable } = useApp();

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(18px,4vw,32px) 16px 60px' }}>
      {/* หัวเรื่องต้อนรับ — สั้น เข้าเรื่อง */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', border: '1px solid var(--line)', borderRadius: 100, background: '#fff', fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, marginBottom: 12 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--safe)' }} />
          เทศบาลนครยะลา · บริการครัวเรือนดิจิทัล
        </div>
        <h1 style={{ fontSize: 'clamp(22px,5vw,28px)', lineHeight: 1.25 }}>
          สวัสดี {household?.name ? <span style={{ color: 'var(--primary)' }}>{household.name}</span> : 'ครัวเรือนของคุณ'} 👋
        </h1>
        <p style={{ fontSize: 14.5, color: '#52607A', margin: '4px 0 0' }}>
          {household?.address || 'บ้านของคุณ'} · เลือกบริการที่ต้องการด้านล่างได้เลย
        </p>
      </div>

      {/* สถานะตัวตน/แจ้งเตือน LINE */}
      <div style={{ marginBottom: 16 }}>
        <ProfileCard />
      </div>

      {/* แถบเตือนกลุ่มเปราะบาง */}
      {hasVulnerable && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 12, padding: '12px 15px', marginBottom: 16, fontSize: 13.5, color: 'var(--danger)', lineHeight: 1.6 }}>
          🔴 บ้านนี้มีสมาชิกกลุ่มเปราะบาง — เปิดสิทธิ์กายอุปกรณ์ (เตียง/ผ้าอ้อม) และปักหมุดอพยพก่อนเมื่อเกิดภัยพิบัติ
        </div>
      )}

      {/* ฟีเจอร์หลัก — กระเป๋าเมืองเด่นสุด */}
      <button onClick={() => navigate('/civic-wallet')} className="yh-card" style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
        background: 'linear-gradient(120deg,#0E8390,#0A6470)', border: 'none', borderRadius: 18, padding: '20px 20px', marginBottom: 14, boxShadow: '0 8px 22px rgba(14,131,144,.28)',
      }}>
        <span aria-hidden="true" style={{ fontSize: 34, flex: 'none' }}>🏡</span>
        <div style={{ flex: 1, minWidth: 0, color: '#fff' }}>
          <div style={{ fontWeight: 700, fontSize: 19 }}>กระเป๋าเมือง & บิลของบ้าน</div>
          <div style={{ fontSize: 14, color: '#DDF3F5', lineHeight: 1.5 }}>ค่าน้ำ · ค่าขยะ · ภาษีที่ดิน · จ่ายแล้วรับสลิปทาง LINE</div>
        </div>
        <span aria-hidden="true" style={{ color: '#fff', fontWeight: 700, fontSize: 22, flex: 'none' }}>→</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FeatureRow
          emoji="🌊"
          icon={<ReliefIcon color="var(--amber)" size={24} />}
          soft="var(--amber-soft)" accent="var(--amber)"
          title="ยื่นเยียวยาภัยพิบัติ" tag="คลิกเดียว"
          sub="ถ่ายรูปความเสียหาย ระบบดึงพิกัด/พร้อมเพย์ให้อัตโนมัติ"
          onClick={() => navigate('/relief')}
        />
        {hasVulnerable && (
          <FeatureRow
            emoji="♿"
            soft="var(--danger-soft)" accent="var(--danger)"
            title="รักษาสิทธิ์สวัสดิการ" tag="กลุ่มเปราะบาง"
            sub="ขอผ้าอ้อม/ยืมเตียงผู้ป่วย ติดตามสถานะแบบขนส่ง"
            onClick={() => navigate('/share?tab=welfare')}
          />
        )}
        <FeatureRow
          emoji="🤝"
          icon={<ShareIcon color="var(--primary)" size={24} />}
          title="ศูนย์แบ่งปัน & จ้างงานชุมชน"
          sub="ขอรับ/แบ่งปันสิ่งของ · หางาน-รับงานในชุมชน"
          onClick={() => navigate('/share')}
        />
        <FeatureRow
          emoji="💚"
          icon={<MindIcon color="var(--safe)" size={24} />}
          soft="var(--safe-soft)" accent="var(--safe)"
          title="คุยกับใจ"
          sub="ประเมินสุขภาพจิตเบื้องต้น พร้อมส่งต่อบุคลากรจริง"
          onClick={() => navigate('/mind-talk')}
        />
        <FeatureRow
          emoji="🧾"
          title="ประวัติการชำระเงิน"
          sub="ดูรายการบิลที่จ่ายแล้วทั้งหมด · เก็บสลิปไว้ตรวจสอบ"
          onClick={() => navigate('/payments')}
        />
      </div>

      {/* ลิงก์เจ้าหน้าที่ */}
      <button onClick={() => navigate('/staff')} style={{
        width: '100%', marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: 'none', border: '1px solid var(--line)', color: '#5A6675', padding: 12, borderRadius: 11, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
      }}>
        <DashboardIcon color="#5A6675" size={16} /> สำหรับเจ้าหน้าที่เทศบาล / ปภ. / อสม.
      </button>
    </main>
  );
}
