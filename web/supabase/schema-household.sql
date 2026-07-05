-- ============================================================
-- Yala Heal — สำมะโนครัวดิจิทัล (Digital House Card)
-- วิธีใช้: เปิด Supabase → โปรเจกต์ของคุณ → เมนู "SQL Editor"
--         วางทั้งไฟล์นี้แล้วกด "Run"
-- ============================================================

create table if not exists households (
  id                  bigint generated always as identity primary key,
  phone               text not null unique,
  line_user_id        text,
  name                text,
  water_account_no    text,                 -- เลขที่บ้าน/รหัสผู้ใช้น้ำ (ใช้ดึงข้อมูลเดิม)
  address             text,
  district            text,
  subdistrict         text,
  lat                 double precision,
  lng                 double precision,
  promptpay_account   text,
  vulnerable          boolean not null default false,
  vulnerable_types    text[],               -- เช่น ['ผู้สูงอายุ','ผู้พิการ','ผู้ป่วยติดเตียง']
  pdpa_consent        boolean not null default false,
  onboarded_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table households enable row level security;

-- เพิ่ม/อัปเดตได้ทุกคน (เดโม — ถ้าใช้จริงต้องผูกกับ auth.uid() หรือ session ฝั่งเซิร์ฟเวอร์)
create policy "households_insert" on households for insert with check (true);
create policy "households_update" on households for update using (true);
create policy "households_select" on households for select using (true);
