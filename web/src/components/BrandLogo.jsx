import { useState } from 'react';

// ตราสำรอง (แสดงเมื่อยังไม่มีไฟล์ /assets/yala-logo.png)
function FallbackMark({ size }) {
  const inner = size * 0.4;
  const thick = Math.max(3, size * 0.095);
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flex: 'none' }}>
      <span style={{ position: 'absolute', width: inner, height: thick, borderRadius: 3, background: '#fff' }} />
      <span style={{ position: 'absolute', width: thick, height: inner, borderRadius: 3, background: '#fff' }} />
    </span>
  );
}

// ตราเทศบาลนครยะลา — ใช้ไฟล์จริงถ้ามี ไม่งั้นแสดงตราสำรองอัตโนมัติ
export default function BrandLogo({ size = 42 }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <FallbackMark size={size} />;
  return (
    <img
      src="/assets/yala-logo.png"
      alt="ตราเทศบาลนครยะลา"
      onError={() => setOk(false)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain', background: '#fff', flex: 'none' }}
    />
  );
}
