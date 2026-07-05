// QR จำลองแบบ deterministic (สร้างลายจากสตริง) — ใช้โชว์หน้าชำระเงินโดยไม่ต้องพึ่งบริการภายนอก
// ของจริงค่อยแทนด้วย PromptPay QR payload ที่กองคลังออกให้
export default function QrBox({ seed = 'yala', size = 168 }) {
  const N = 21; // ตาราง 21x21 แบบ QR มาตรฐาน
  // hash ง่ายๆ จาก seed → ใช้กำหนดว่าช่องไหนทึบ
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  const rand = (i) => {
    const x = Math.sin(h + i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const cell = size / N;
  const isFinder = (r, c) => (
    (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7)
  );
  const rects = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isFinder(r, c)) continue;
      if (rand(r * N + c) > 0.55) rects.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#122A4A" />);
    }
  }
  const Finder = ({ x, y }) => (
    <g transform={`translate(${x},${y})`}>
      <rect width={cell * 7} height={cell * 7} fill="#122A4A" />
      <rect x={cell} y={cell} width={cell * 5} height={cell * 5} fill="#fff" />
      <rect x={cell * 2} y={cell * 2} width={cell * 3} height={cell * 3} fill="#122A4A" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: '#fff', borderRadius: 10, display: 'block' }} role="img" aria-label="QR พร้อมเพย์ (ตัวอย่าง)">
      <rect width={size} height={size} fill="#fff" />
      {rects}
      <Finder x={0} y={0} />
      <Finder x={cell * (N - 7)} y={0} />
      <Finder x={0} y={cell * (N - 7)} />
    </svg>
  );
}
