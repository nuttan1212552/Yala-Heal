export default function TopBar() {
  return (
    <div style={{ background: 'var(--primary-d)', color: '#EAF0F8', fontSize: '13.5px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '8px 20px', display: 'flex', flexWrap: 'wrap', gap: '6px 20px', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CD3A0' }} />
          เว็บไซต์ต้นแบบเพื่อการนำเสนอ · เทศบาลนครยะลา
        </span>
        <span style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <span>แจ้งเหตุ 199</span>
          <span>สุขภาพจิต 1323</span>
        </span>
      </div>
    </div>
  );
}
