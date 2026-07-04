-- ============================================================
-- Yala Heal — ทำให้ทุกฟอร์มบันทึกจริง + เก็บข้อมูลยืนยันตัวตน
-- วิธีใช้: เปิด Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run
-- ============================================================

-- ---------- 1) คำขอในศูนย์แบ่งปัน (ขอรับ / สมัครอาสา / แจ้งมีให้) ----------
create table if not exists share_requests (
  id         bigint generated always as identity primary key,
  item_name  text,
  type       text,                      -- need | give | gig
  name       text not null,
  phone      text,
  qty        text,
  note       text,
  created_at timestamptz not null default now()
);

alter table share_requests enable row level security;
create policy "share_req_read"   on share_requests for select using (true);
create policy "share_req_insert" on share_requests for insert with check (true);

-- ---------- 2) เก็บข้อมูลยืนยันตัวตนของผู้รับงาน ----------
alter table job_applications add column if not exists full_name   text;
alter table job_applications add column if not exists national_id text;
alter table job_applications add column if not exists id_method   text;  -- form | thaid

-- ---------- 3) เก็บเลขบัตรผู้ยื่นเยียวยา (ก่อนหน้านี้กรอกแต่ไม่ได้บันทึก) ----------
alter table relief_claims add column if not exists national_id text;
alter table relief_claims add column if not exists id_method   text;  -- form | thaid
