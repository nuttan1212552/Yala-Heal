import { useEffect, useState } from 'react';
import { fetchSosCases, fetchDashboardStats, MOCK_DASH_CASES } from '../lib/db';

const PILL_MAP = {
  'รอดำเนินการ': ['rgba(192,54,46,.1)', '#C0362E'],
  'กำลังดำเนินการ': ['rgba(179,107,0,.1)', '#B36B00'],
  'เสร็จสิ้น': ['rgba(14,138,95,.1)', '#0E8A5F'],
};

const FALLBACK_WEEK = [44, 66, 52, 92, 74, 58, 46].map((h, i) => ({ label: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'][i], height: h }));

export default function Dashboard() {
  const [shown, setShown] = useState(5);
  const [cases, setCases] = useState(MOCK_DASH_CASES);
  const [stats, setStats] = useState({ total: 128, pending: 14, inProgress: 37, done: 91, week: FALLBACK_WEEK });

  useEffect(() => {
    let alive = true;
    fetchSosCases().then((rows) => { if (alive) setCases(rows); });
    fetchDashboardStats().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, []);

  const dashShown = Math.min(shown, cases.length);
  const rows = cases.slice(0, dashShown);
  const hasMore = dashShown < cases.length;
  const remaining = cases.length - dashShown;

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(24px,4vw,44px) 20px 72px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontSize: 'clamp(23px,3.4vw,30px)' }}>Dashboard เทศบาล · ภาพรวมสถานการณ์</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--safe)', fontWeight: 600 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--safe)', animation: 'softblink 1.5s infinite' }} /> เรียลไทม์ · เชื่อมฐานข้อมูลกลาง
        </div>
      </div>
      <p style={{ color: '#52607A', fontSize: 15, margin: '0 0 24px' }}>มุมมองสำหรับเจ้าหน้าที่ รวมทุกบริการจากฐานข้อมูลกลางไว้ในหน้าจอเดียว</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}><div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 28, fontWeight: 700, color: '#122A4A' }}>{stats.total}</div><div style={{ fontSize: 13.5, color: '#52607A' }}>เคสทั้งหมด</div></div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}><div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 28, fontWeight: 700, color: 'var(--danger)' }}>{stats.pending}</div><div style={{ fontSize: 13.5, color: '#52607A' }}>SOS รอดำเนินการ</div></div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}><div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 28, fontWeight: 700, color: 'var(--amber)' }}>{stats.inProgress}</div><div style={{ fontSize: 13.5, color: '#52607A' }}>กำลังดำเนินการ</div></div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}><div style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 28, fontWeight: 700, color: 'var(--safe)' }}>{stats.done}</div><div style={{ fontSize: 13.5, color: '#52607A' }}>เสร็จสิ้น</div></div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 22 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>เคสรายวัน (7 วันล่าสุด)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
            {stats.week.map((d, i) => (
              <div key={i} style={{ flex: 1, background: d.height === Math.max(...stats.week.map((x) => x.height)) ? 'var(--primary)' : 'var(--primary-soft)', borderRadius: '5px 5px 0 0', height: d.height + '%', transition: 'height .3s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {stats.week.map((d, i) => <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#8592A3' }}>{d.label}</span>)}
          </div>
        </div>

        <div style={{ flex: '1 1 260px', background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 22 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>แผนที่พื้นที่เสี่ยงน้ำท่วม · เขตเทศบาลนครยะลา</h3>
          <div style={{ position: 'relative', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: '#EDF2F8' }}>
            <img src="/assets/yala-flood-map.png" alt="แผนที่ชุมชนพื้นที่เสี่ยงน้ำท่วม เทศบาลนครยะลา" loading="lazy" style={{ width: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(255,255,255,.92)', borderRadius: 8, padding: '5px 10px', fontSize: 11.5, color: '#52607A' }}>แผนที่ชุมชน · จำแนกตามระดับน้ำท่วมขัง</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, fontSize: 12.5, color: '#52607A', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: '#E23B3B' }} /> ท่วมทั้งพื้นที่</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: '#E8A23D' }} /> ท่วมส่วนใหญ่</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: '#EEDB45' }} /> ท่วมบางส่วน</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: '#8FD08A' }} /> ไม่ท่วม</span>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 22, marginTop: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>เคสล่าสุด</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((r) => {
            const [bg, color] = PILL_MAP[r.status];
            return (
              <div key={r.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '12px 6px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontFamily: "'IBM Plex Sans Thai'", fontSize: 13.5, color: '#52607A', flex: '0 0 84px' }}>{r.id}</span>
                <span style={{ flex: 1, minWidth: 120, fontWeight: 600, color: '#122A4A', fontSize: 14.5 }}>{r.title}</span>
                <span style={{ fontSize: 13, color: '#52607A', flex: '0 0 auto' }}>{r.zone}</span>
                <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12.5, fontWeight: 700, background: bg, color, flex: '0 0 auto' }}>{r.status}</span>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <button onClick={() => setShown((s) => s + 5)} style={{ marginTop: 14, width: '100%', background: '#fff', border: '1.5px solid var(--line)', color: 'var(--primary)', padding: 13, borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: 'pointer', minHeight: 48 }}>
            โหลดเพิ่ม (เหลืออีก {remaining} รายการ)
          </button>
        )}
      </div>
    </main>
  );
}
