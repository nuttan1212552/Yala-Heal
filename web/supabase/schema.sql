-- ============================================================
-- Yala Heal — โครงสร้างฐานข้อมูล Supabase
-- วิธีใช้: เปิด Supabase → โปรเจกต์ของคุณ → เมนู "SQL Editor"
--         วางทั้งไฟล์นี้แล้วกด "Run"
-- ============================================================

-- ---------- 1) ศูนย์แบ่งปันเหลือ-ขาด ----------
create table if not exists donations (
  id          bigint generated always as identity primary key,
  type        text not null check (type in ('need','give','gig')),
  name        text not null,
  qty         text,
  zone        text,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------- 2) SOS แจ้งเหตุฉุกเฉิน ----------
create table if not exists sos_reports (
  id            bigint generated always as identity primary key,
  ticket        text not null,
  phone         text,
  incident_type text,
  people        int,
  vuln          text[],
  note          text,
  zone          text default 'ต.สะเตง',
  status        text not null default 'รอดำเนินการ'
                  check (status in ('รอดำเนินการ','กำลังดำเนินการ','เสร็จสิ้น')),
  created_at    timestamptz not null default now()
);

-- ---------- 3) เงินเยียวยา ----------
create table if not exists relief_claims (
  id          bigint generated always as identity primary key,
  ref         text not null,
  name        text,
  grade       text,
  water_level text,
  mode        text check (mode in ('confirm','appeal')),
  created_at  timestamptz not null default now()
);

-- ---------- 4) คิวทีมดูแลใจ (คุยกับใจ) ----------
create table if not exists mind_requests (
  id          bigint generated always as identity primary key,
  ref         text not null,
  phone       text,
  urgent      boolean default false,
  position    int,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- หมายเหตุ: นโยบายด้านล่างเปิดให้ผู้ใช้ทั่วไป (anon) อ่าน/เพิ่มได้
--          เหมาะสำหรับ "เดโมงานแข่ง" เท่านั้น
--          ถ้าจะใช้จริงกับข้อมูลประชาชน ต้องเพิ่มระบบ login (Supabase Auth)
--          และจำกัดสิทธิ์ให้รัดกุมกว่านี้
-- ============================================================
alter table donations     enable row level security;
alter table sos_reports   enable row level security;
alter table relief_claims enable row level security;
alter table mind_requests enable row level security;

-- donations: อ่านได้ทุกคน + เพิ่มได้ทุกคน
create policy "donations_read"   on donations     for select using (true);
create policy "donations_insert" on donations     for insert with check (true);

-- sos_reports: อ่านได้ (สำหรับ Dashboard) + เพิ่มได้
create policy "sos_read"         on sos_reports   for select using (true);
create policy "sos_insert"       on sos_reports   for insert with check (true);

-- relief_claims: เพิ่มได้อย่างเดียว (ไม่เปิดให้อ่านสาธารณะ เพราะเป็นข้อมูลอ่อนไหว)
create policy "relief_insert"    on relief_claims for insert with check (true);

-- mind_requests: เพิ่มได้อย่างเดียว (ข้อมูลอ่อนไหว)
create policy "mind_insert"      on mind_requests for insert with check (true);

-- ============================================================
-- ข้อมูลตัวอย่างเริ่มต้น (seed) — ศูนย์แบ่งปัน
-- ============================================================
insert into donations (type, name, qty, zone, note) values
  ('need', 'น้ำดื่มสะอาด',        'ต้องการ 12 แพ็ค', 'ชุมชนบ้านร่ม',   'มีเด็กเล็กและผู้สูงอายุ'),
  ('give', 'ข้าวสาร 5 กก.',        'แบ่งปันได้ 8 ถุง', 'ครัวกลางชุมชน',  'รับที่จุดแจกจ่าย'),
  ('need', 'ยาสามัญ/เวชภัณฑ์',     'ต้องการด่วน',      'ตลาดเก่า',       'ยาแก้ไข้ ผ้าพันแผล'),
  ('gig',  'อาสาช่วยขนของ',        'ต้องการ 3 คน',     'ท่าเรือ',        'ช่วงบ่ายวันนี้'),
  ('give', 'ผ้าห่ม/เสื้อผ้า',       'แบ่งปันได้ 20 ชุด', 'วัดกลาง',        'สภาพดี ซักสะอาด');

-- ข้อมูลตัวอย่าง SOS สำหรับให้ Dashboard มีรายการแสดงตั้งแต่แรก
insert into sos_reports (ticket, incident_type, zone, status) values
  ('YH-284913', 'ขอความช่วยเหลือ · ติดค้างบนหลังคา', 'ต.สะเตง',    'รอดำเนินการ'),
  ('YH-284902', 'ผู้ป่วยติดเตียงต้องอพยพ',            'ต.บุดี',     'กำลังดำเนินการ'),
  ('YH-284888', 'ขอเรือรับส่ง 4 คน',                  'ต.ยุโป',     'กำลังดำเนินการ'),
  ('YH-284790', 'อพยพครอบครัว 5 คน สำเร็จ',           'ต.สะเตง',    'เสร็จสิ้น'),
  ('YH-284712', 'ขอถุงยังชีพ 20 ครัวเรือน',           'ต.ท่าสาป',   'รอดำเนินการ'),
  ('YH-284655', 'น้ำท่วมขังถนนเข้าหมู่บ้าน',          'ต.สะเตงนอก', 'กำลังดำเนินการ');
