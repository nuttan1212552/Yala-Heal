import { useEffect, useRef, useState } from 'react';

// พิกัดกลางเทศบาลนครยะลา (ใช้เป็นจุดเริ่มต้นของแผนที่)
const YALA_CENTER = [6.5411, 101.2807];
const DEFAULT_ZOOM = 14;

// แผนที่ปักหมุด — ใช้ Leaflet + OpenStreetMap (โหลดจาก CDN ใน index.html, ไม่ต้องใช้ API key)
// ผู้ใช้คลิกบนแผนที่เพื่อวางหมุด หรือกด "ใช้ตำแหน่งของฉัน" เพื่อดึงพิกัด GPS
export default function MapPicker({ value, onChange }) {
  const mapRef = useRef(null);        // instance ของ Leaflet map
  const markerRef = useRef(null);     // หมุด
  const placeRef = useRef(null);      // ฟังก์ชันวางหมุด (แชร์ระหว่างคลิก/GPS)
  const containerRef = useRef(null);  // <div> ที่ map ยึด
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(Boolean(window.L));
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState('');

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // รอ Leaflet โหลดเสร็จ (เผื่อ CDN ยังมาไม่ถึงตอน component mount)
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const t = setInterval(() => { if (window.L) { setReady(true); clearInterval(t); } }, 200);
    return () => clearInterval(t);
  }, []);

  // สร้างแผนที่ครั้งเดียวเมื่อ Leaflet พร้อม
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = window.L;
    const start = (value && value.lat && value.lng) ? [value.lat, value.lng] : YALA_CENTER;
    const map = L.map(containerRef.current).setView(start, DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const place = (lat, lng) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const p = markerRef.current.getLatLng();
          onChangeRef.current?.({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
        });
      }
      onChangeRef.current?.({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
    };
    placeRef.current = place;

    if (value && value.lat && value.lng) place(value.lat, value.lng);
    map.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;

    // แผนที่มักคำนวณขนาดผิดถ้าถูกสร้างใน container ที่เพิ่งแสดง — invalidate หลัง mount
    setTimeout(() => map.invalidateSize(), 200);

    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoErr('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'); return; }
    setLocating(true); setGeoErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) mapRef.current.setView([latitude, longitude], 17);
        if (placeRef.current) placeRef.current(latitude, longitude);
        else onChangeRef.current?.({ lat: +latitude.toFixed(6), lng: +longitude.toFixed(6) });
      },
      () => { setLocating(false); setGeoErr('ดึงตำแหน่งไม่สำเร็จ — อนุญาตการเข้าถึงตำแหน่ง หรือคลิกปักหมุดบนแผนที่เอง'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1.5px solid var(--primary)', padding: '9px 15px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: locating ? 'wait' : 'pointer', minHeight: 42 }}
        >
          {locating ? 'กำลังระบุตำแหน่ง…' : '📍 ใช้ตำแหน่งของฉัน'}
        </button>
        {value && value.lat
          ? <span style={{ fontSize: 13, color: 'var(--safe)', fontWeight: 600 }}>✓ ปักหมุดแล้ว: {value.lat}, {value.lng}</span>
          : <span style={{ fontSize: 13, color: '#8592A3' }}>คลิกบนแผนที่เพื่อปักหมุดตำแหน่งบ้าน</span>}
      </div>
      <div
        ref={containerRef}
        style={{ height: 280, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', background: '#EDF2F8' }}
      >
        {!ready && <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8592A3', fontSize: 14 }}>กำลังโหลดแผนที่…</div>}
      </div>
      {geoErr && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13.5, marginTop: 8 }}>{geoErr}</div>}
    </div>
  );
}
