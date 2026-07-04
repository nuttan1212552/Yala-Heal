import { useNavigate } from 'react-router-dom';
import { MindIcon, ShareIcon, ReliefIcon } from '../components/Icons';
import ProfileCard from '../components/ProfileCard';

const securityItems = [
  { title: 'AI แนะนำ ไม่ใช่ AI ตัดสิน', text: 'มนุษย์เป็นผู้อนุมัติสุดท้ายเสมอ ในทุกเรื่องที่กระทบสิทธิ์ประชาชน' },
  { title: 'ยืนยันตัวตนมาตรฐานเดียว', text: 'ใช้ ThaID ทั่วทั้งระบบ ลดความเสี่ยงการปลอมตัวและความสับสน' },
  { title: 'ทำงานได้แม้เน็ต/ไฟดับ', text: 'ออกแบบแบบ Offline-first มีสายด่วนและกลไกสำรองรองรับภาวะวิกฤต' },
  { title: 'บันทึก Audit Log ทุกจุด', text: 'ทุกครั้งที่แตะเงินหรือข้อมูลอ่อนไหว ถูกบันทึกและตรวจสอบย้อนหลังได้' },
  { title: 'แยกเก็บข้อมูลตามความอ่อนไหว', text: 'สุขภาพจิต การเงิน และที่อยู่ แยกฐานข้อมูล จำกัดการเข้าถึงเฉพาะที่จำเป็น' },
  { title: 'อุทธรณ์ได้ทุกจุดสำคัญ', text: 'ทุกการตัดสินใจที่กระทบสิทธิ์ มีช่องทางให้ประชาชนขอทบทวนเสมอ' },
];

const roadmapItems = [
  { n: '01', phase: 'เฟส 1 · รากฐาน', title: 'ฐานข้อมูลกลาง', text: 'วางระบบฐานข้อมูลกลางที่เชื่อมทุกบริการเข้าด้วยกัน ให้ข้อมูลถูกต้องและช่วยเหลือประชาชนได้เร็วตั้งแต่วันแรก', tone: 'strong' },
  { n: '02', phase: 'เฟส 2 · ชุมชนช่วยกัน', title: 'ศูนย์แบ่งปัน + ส่งต่องาน', text: 'เปิดระบบแบ่งปันเหลือ-ขาด และเครือข่ายอาสาสมัคร ให้ชุมชนช่วยกันอย่างทั่วถึง' },
  { n: '03', phase: 'เฟส 3 · ฟื้นฟูรอบด้าน', title: 'เงินเยียวยา + คุยกับใจ', text: 'เพิ่มการเยียวยาการเงินอย่างโปร่งใส และการดูแลสุขภาพจิต ครอบคลุมทั้งกายและใจ' },
];

const cardStyle = {
  textAlign: 'left', cursor: 'pointer', background: '#fff', border: '1px solid var(--line)', borderRadius: 16,
  padding: 26, boxShadow: '0 1px 3px rgba(16,24,40,.05)', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 44,
};
const iconWrap = (bg) => ({ width: 52, height: 52, borderRadius: 13, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' });

export default function Home() {
  const navigate = useNavigate();

  return (
    <main>
      {/* HERO */}
      <section id="hero" style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--line)' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/yala-mascots.png')", backgroundSize: 'cover', backgroundPosition: 'center 62%', pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(243,247,248,.97) 0%,rgba(243,247,248,.9) 38%,rgba(243,247,248,.55) 62%,rgba(243,247,248,.12) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: 'clamp(44px,6vw,80px) 20px clamp(130px,22vw,280px)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 15px', border: '1px solid var(--line)', borderRadius: 100, background: '#fff', fontSize: 14, color: 'var(--primary)', fontWeight: 600, marginBottom: 22 }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--safe)' }} />
            บริการดิจิทัลของเทศบาลนครยะลา
          </div>
          <h1 style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.14, fontWeight: 700, margin: '0 auto 18px', maxWidth: 820 }}>
            เมื่อภัยพิบัติมา ยะลาต้อง<br />ไม่มีใคร<span style={{ color: 'var(--primary)' }}>ถูกทิ้งไว้ข้างหลัง</span>
          </h1>
          <p style={{ fontSize: 'clamp(17px,2vw,20px)', lineHeight: 1.65, color: '#3A485F', maxWidth: 640, margin: '0 auto 30px' }}>
            ผู้ช่วยผ่าน LINE Official Account ที่รวม 3 บริการหลักไว้ในที่เดียว เลือกบริการที่ต้องการด้านล่างเพื่อเริ่มใช้งานได้ทันที
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <a href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', background: 'var(--primary)', color: '#fff', padding: '15px 28px', borderRadius: 11, fontWeight: 700, fontSize: 16.5, minHeight: 44 }}>
              เลือกใช้บริการ <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>

      {/* FEATURE PICKER */}
      <section id="features" style={{ padding: 'clamp(52px,7vw,84px) 20px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ maxWidth: 760, margin: '0 auto 36px' }}>
            <ProfileCard />
          </div>
          <div className="reveal" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 40px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>เลือกบริการ</div>
            <h2 style={{ fontSize: 'clamp(26px,3.6vw,40px)', lineHeight: 1.16, marginBottom: 12 }}>3 บริการหลัก กดเข้าใช้งานได้เลย</h2>
            <p style={{ fontSize: 17.5, color: '#3A485F', margin: 0 }}>ทุกบริการเป็นตัวอย่างที่ใช้งานได้จริง กรอกข้อมูลและกดปุ่มได้ทุกขั้นตอน (ข้อมูลตัวอย่าง)</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 18 }}>
            <button onClick={() => navigate('/mind-talk')} className="reveal" style={cardStyle}>
              <span aria-hidden="true" style={iconWrap('var(--safe-soft)')}><MindIcon color="var(--safe)" /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#122A4A', marginBottom: 5 }}>คุยกับใจ</div>
                <p style={{ margin: 0, fontSize: 15, color: '#52607A', lineHeight: 1.55 }}>ประเมินสุขภาพจิตเบื้องต้นตามเกณฑ์กรมสุขภาพจิต พร้อมส่งต่อบุคลากรจริง</p>
              </div>
              <span style={{ marginTop: 'auto', color: 'var(--primary)', fontWeight: 700, fontSize: 15 }}>เข้าใช้บริการ →</span>
            </button>
            <button onClick={() => navigate('/share')} className="reveal" style={cardStyle}>
              <span aria-hidden="true" style={iconWrap('var(--primary-soft)')}><ShareIcon color="var(--primary)" /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#122A4A', marginBottom: 5 }}>ศูนย์แบ่งปันเหลือ-ขาด</div>
                <p style={{ margin: 0, fontSize: 15, color: '#52607A', lineHeight: 1.55 }}>ขอรับหรือแบ่งปันสิ่งของ และลงประกาศหาอาสาสมัคร ผูกโควตากับ ThaID</p>
              </div>
              <span style={{ marginTop: 'auto', color: 'var(--primary)', fontWeight: 700, fontSize: 15 }}>เข้าใช้บริการ →</span>
            </button>
            <button onClick={() => navigate('/relief')} className="reveal" style={cardStyle}>
              <span aria-hidden="true" style={iconWrap('var(--amber-soft)')}><ReliefIcon color="var(--amber)" /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#122A4A', marginBottom: 5 }}>ระบบเงินเยียวยา</div>
                <p style={{ margin: 0, fontSize: 15, color: '#52607A', lineHeight: 1.55 }}>ยืนยัน ThaID ถ่ายภาพความเสียหาย ประเมินระดับอย่างโปร่งใส และยื่นอุทธรณ์ได้</p>
              </div>
              <span style={{ marginTop: 'auto', color: 'var(--primary)', fontWeight: 700, fontSize: 15 }}>เข้าใช้บริการ →</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" style={{ padding: 'clamp(52px,7vw,88px) 20px', background: '#fff', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="reveal" style={{ maxWidth: 720, marginBottom: 40 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>ความปลอดภัยและความน่าเชื่อถือ</div>
            <h2 style={{ fontSize: 'clamp(25px,3.4vw,38px)', lineHeight: 1.18, marginBottom: 12 }}>ระบบที่คิดมาอย่างรอบคอบตั้งแต่วันแรก</h2>
            <p style={{ fontSize: 17, color: '#3A485F', margin: 0 }}>ทุกจุดที่แตะเงิน ข้อมูลส่วนตัว หรือการตัดสินใจสำคัญ ถูกออกแบบให้ปลอดภัย ตรวจสอบได้ และมีมนุษย์กำกับเสมอ</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            {securityItems.map((it) => (
              <div key={it.title} className="reveal" style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 22, background: '#fff' }}>
                <h3 style={{ fontSize: 17, marginBottom: 7 }}>{it.title}</h3>
                <p style={{ fontSize: 14.5, color: '#52607A', margin: 0, lineHeight: 1.6 }}>{it.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" style={{ padding: 'clamp(52px,7vw,88px) 20px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 40px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Roadmap</div>
            <h2 style={{ fontSize: 'clamp(25px,3.4vw,38px)', lineHeight: 1.16, marginBottom: 12 }}>เส้นทางการพัฒนา 3 เฟส</h2>
            <p style={{ fontSize: 17, color: '#3A485F', margin: 0 }}>เริ่มจากสิ่งที่ช่วยชีวิตได้เร็วที่สุด แล้วขยายความครบถ้วนของระบบ</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {roadmapItems.map((r) => (
              <div key={r.n} className="reveal" style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 240px' }}>
                  <div aria-hidden="true" style={{
                    width: 54, height: 54, borderRadius: 14,
                    background: r.tone === 'strong' ? 'var(--primary)' : 'var(--primary-soft)',
                    color: r.tone === 'strong' ? '#fff' : 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'IBM Plex Sans Thai'", fontWeight: 700, fontSize: 19, flex: 'none',
                  }}>{r.n}</div>
                  <div>
                    <div style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 700 }}>{r.phase}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#122A4A' }}>{r.title}</div>
                  </div>
                </div>
                <p style={{ flex: '1 1 260px', fontSize: 15, color: '#52607A', margin: 0, minWidth: 0 }}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
