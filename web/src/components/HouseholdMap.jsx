import { useEffect, useRef, useState } from 'react';

const YALA_CENTER = [6.5411, 101.2807];

// แผนที่แสดงผลอย่างเดียว (Command Center) — ปักหมุดบ้าน/เคสแบบ Real-time
// households: [{lat,lng,name,address,vulnerable,vulnerableTypes}]
// claims:     [{lat,lng,name,ai_grade,grade,status,tracking_id}]  (จุดเยียวยา)
export default function HouseholdMap({ households = [], claims = [], height = 380 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [ready, setReady] = useState(Boolean(window.L));

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const t = setInterval(() => { if (window.L) { setReady(true); clearInterval(t); } }, 200);
    return () => clearInterval(t);
  }, []);

  // สร้างแผนที่ครั้งเดียว
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = window.L;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(YALA_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
  }, [ready]);

  // วาดหมุดใหม่ทุกครั้งที่ข้อมูลเปลี่ยน (Real-time)
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    const L = window.L;
    layerRef.current.clearLayers();
    const pts = [];

    households.filter((h) => h.lat && h.lng).forEach((h) => {
      const vuln = h.vulnerable;
      const color = vuln ? '#D6402E' : '#0E8390';
      const m = L.circleMarker([h.lat, h.lng], {
        radius: vuln ? 9 : 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.92,
      });
      m.bindPopup(`<b>${h.name || 'ครัวเรือน'}</b><br>${h.address || ''}${vuln ? `<br><span style="color:#D6402E;font-weight:700">🔴 กลุ่มเปราะบาง: ${(h.vulnerableTypes || []).join(', ')}</span>` : ''}`);
      if (vuln) m.setStyle({ className: 'pulse-red' });
      layerRef.current.addLayer(m);
      pts.push([h.lat, h.lng]);
    });

    claims.filter((c) => c.lat && c.lng).forEach((c) => {
      const g = String(c.ai_grade || c.grade || '2');
      const color = g === '4' ? '#8B1A10' : g === '3' ? '#C0362E' : g === '2' ? '#B36B00' : '#0E8A5F';
      const m = L.marker([c.lat, c.lng]);
      m.bindPopup(`<b>เคสเยียวยา ระดับ ${g}</b><br>${c.name || ''}<br>${c.tracking_id || ''} · ${c.status || 'รอตรวจสอบ'}`);
      // ใช้ divIcon สีตามระดับ
      m.setIcon(L.divIcon({ className: '', html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`, iconSize: [16, 16], iconAnchor: [8, 16] }));
      layerRef.current.addLayer(m);
      pts.push([c.lat, c.lng]);
    });

    if (pts.length) {
      try { mapRef.current.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); } catch { /* noop */ }
    }
  }, [households, claims, ready]);

  return (
    <div ref={containerRef} style={{ height, width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', background: '#EDF2F8' }}>
      {!ready && <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8592A3', fontSize: 14 }}>กำลังโหลดแผนที่…</div>}
    </div>
  );
}
