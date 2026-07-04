// ============================================================
// ตัวสร้าง LINE Flex Message — การ์ดแจ้งเตือนสไตล์เดียวกันทั้งระบบ
// (คล้ายการ์ดสลิป/แจ้งเตือนของธนาคาร) แก้สี/หัวข้อ/แถวข้อมูลได้ง่าย
// ============================================================

export const SITE = 'https://yala-heal.vercel.app';
const BRAND = 'Yala Heal · เทศบาลนครยะลา';

// แถวข้อมูล 1 บรรทัด (หัวข้อซ้าย · ค่าขวา)
export function row(label, value, valueColor = '#122A4A') {
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'md',
    contents: [
      { type: 'text', text: String(label), size: 'sm', color: '#8592A3', flex: 4, wrap: true },
      { type: 'text', text: String(value ?? '-'), size: 'sm', color: valueColor, weight: 'bold', flex: 6, wrap: true, align: 'end' },
    ],
  };
}

// สร้าง Flex bubble การ์ดแจ้งเตือน
// { accent, badge, title?, subtitle?, bigLabel?, bigValue?, rows?, buttonLabel?, buttonUri? }
export function notifyCard({ accent = '#0E8390', badge, title, subtitle, bigLabel, bigValue, rows = [], buttonLabel, buttonUri }) {
  const body = [];
  if (bigLabel) body.push({ type: 'text', text: bigLabel, size: 'xs', color: '#8592A3' });
  if (bigValue) body.push({ type: 'text', text: String(bigValue), size: 'xxl', weight: 'bold', color: accent });
  if (title) body.push({ type: 'text', text: title, size: 'md', weight: 'bold', color: '#122A4A', wrap: true, margin: bigValue ? 'md' : 'none' });
  if (subtitle) body.push({ type: 'text', text: subtitle, size: 'sm', color: '#52607A', wrap: true, margin: 'sm' });
  if (rows.length) {
    body.push({ type: 'separator', margin: 'lg' });
    rows.forEach((r) => body.push(r));
  }

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      backgroundColor: accent,
      contents: [
        { type: 'text', text: badge, color: '#ffffff', weight: 'bold', size: 'lg', wrap: true },
        { type: 'text', text: BRAND, color: '#ffffffcc', size: 'xs', margin: 'xs' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '18px',
      contents: body,
    },
  };

  if (buttonLabel && buttonUri) {
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [
        { type: 'button', style: 'primary', color: accent, height: 'sm', action: { type: 'uri', label: buttonLabel, uri: buttonUri } },
      ],
    };
  }
  return bubble;
}
