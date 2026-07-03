-- ============================================================
-- Yala Heal — เพิ่มระบบ "จ้างงาน/รับงาน" ลงฐานข้อมูลจริง
-- วิธีใช้: เปิด Supabase → โปรเจกต์ของคุณ → เมนู "SQL Editor"
--         วางทั้งไฟล์นี้แล้วกด "Run" (รันแยกจาก schema.sql เดิม)
-- ============================================================

-- ---------- 1) ประกาศงาน ----------
create table if not exists jobs (
  id             bigint generated always as identity primary key,
  title          text not null,
  pay            text,
  zone           text,
  note           text,
  need           int not null default 1,
  applied_base   int not null default 0,   -- จำนวนผู้สมัครเริ่มต้น (ก่อนมีคนสมัครจริงผ่านเว็บ)
  poster         text not null,
  poster_rating  numeric default 5.0,
  poster_jobs    int default 0,
  verified       boolean default true,
  urgent         boolean default false,
  created_at     timestamptz not null default now()
);

-- ---------- 2) ผู้สมัครรับงาน (กันสมัครซ้ำด้วยเบอร์เดียวกัน) ----------
create table if not exists job_applications (
  id         bigint generated always as identity primary key,
  job_id     bigint not null references jobs(id) on delete cascade,
  phone      text not null,
  created_at timestamptz not null default now(),
  unique (job_id, phone)
);

-- ---------- 3) รายงานปัญหา/ผู้ต้องสงสัย ----------
create table if not exists job_reports (
  id         bigint generated always as identity primary key,
  job_id     bigint references jobs(id) on delete cascade,
  reason     text not null,
  created_at timestamptz not null default now()
);

-- ---------- 4) ให้คะแนนหลังทำงานเสร็จ ----------
create table if not exists job_ratings (
  id         bigint generated always as identity primary key,
  job_id     bigint references jobs(id) on delete cascade,
  stars      int not null check (stars between 1 and 5),
  tags       text[],
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — เปิดให้ผู้ใช้ทั่วไปอ่าน/เพิ่มได้ (เดโมงานแข่ง)
-- ============================================================
alter table jobs             enable row level security;
alter table job_applications enable row level security;
alter table job_reports      enable row level security;
alter table job_ratings      enable row level security;

create policy "jobs_read"     on jobs             for select using (true);
create policy "jobs_insert"   on jobs             for insert with check (true);
create policy "job_apps_read"   on job_applications for select using (true);
create policy "job_apps_insert" on job_applications for insert with check (true);
create policy "job_reports_insert" on job_reports for insert with check (true);
create policy "job_ratings_insert" on job_ratings for insert with check (true);

-- ============================================================
-- ข้อมูลตัวอย่างเริ่มต้น (seed) — งานจ้างช่วงน้ำท่วม
-- ============================================================
insert into jobs (title, pay, zone, note, need, applied_base, poster, poster_rating, poster_jobs, verified, urgent) values
  ('ยกของขึ้นที่สูง 2 ชั้น',        'ค่าแรง 400 บ./วัน',         'ต.สะเตง',   'บ้านริมคลอง น้ำกำลังขึ้น ต้องการด่วนบ่ายนี้',                3, 1, 'ร้านวัสดุบ้านรมย์',   4.9, 34, true, true),
  ('พายเรือส่งอาหารผู้สูงอายุ',      'อาสา + ค่าน้ำมัน 200 บ.',   'ต.ท่าสาป',  'เส้นทางในซอยน้ำท่วมสูง มีผู้สูงอายุติดบ้าน 6 หลัง',           4, 2, 'ครัวกลางชุมชน',       4.8, 27, true, false),
  ('ทำความสะอาดบ้านหลังน้ำลด',       'ค่าจ้าง 500 บ.',            'ต.บุดี',    'ล้างโคลน ขนของเสียหายออก',                                   2, 2, 'คุณสมชาย ก.',         4.7, 12, true, false),
  ('ขับรถกระบะขนถุงยังชีพ',         'ค่าน้ำมัน + 350 บ.',        'ต.ยุโป',    'ต้องมีรถกระบะ ขนของจากจุดรวมไปแจก 20 ครัวเรือน',             2, 0, 'อบต.ยุโป',            5.0, 41, true, true),
  ('ดูแลเด็กเล็กที่ศูนย์พักพิง',     'อาสา',                       'ต.สะเตงนอก','ช่วยดูเด็ก 10-15 คน ช่วงพ่อแม่ไปเคลียร์บ้าน',                 5, 3, 'ศูนย์พักพิงเทศบาล',   4.9, 58, true, false);
