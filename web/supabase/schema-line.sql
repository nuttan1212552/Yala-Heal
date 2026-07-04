-- ============================================================
-- Yala Heal — ผูกบัญชี LINE เข้ากับเบอร์โทร เพื่อส่งแจ้งเตือนสถานะงาน
-- วิธีใช้: เปิด Supabase → โปรเจกต์ของคุณ → เมนู "SQL Editor"
--         วางทั้งไฟล์นี้แล้วกด "Run" (รันแยกจาก schema.sql / schema-jobs.sql เดิม)
-- ============================================================

-- ---------- 1) เบอร์โทรผู้ว่าจ้าง (ไว้แจ้งเตือนเมื่อมีคนรับงาน) ----------
alter table jobs add column if not exists poster_phone text;

-- ---------- 2) คู่เบอร์โทร ↔ LINE User ID ----------
create table if not exists line_links (
  phone        text primary key,
  line_user_id text not null,
  display_name text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — เปิดให้ผู้ใช้ทั่วไปอ่าน/เพิ่ม/แก้ได้ (เดโมงานแข่ง)
-- หมายเหตุ: ใช้จริงกับข้อมูลประชาชน ต้องจำกัดสิทธิ์รัดกุมกว่านี้
-- ============================================================
alter table line_links enable row level security;

create policy "line_links_read"   on line_links for select using (true);
create policy "line_links_insert" on line_links for insert with check (true);
create policy "line_links_update" on line_links for update using (true);
