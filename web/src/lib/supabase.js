import { createClient } from '@supabase/supabase-js';

// อ่านค่าจาก environment variables (ตั้งใน .env.local หรือใน Vercel/Netlify)
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ถ้ายังไม่ตั้งค่า supabase จะเป็น null และแอปจะกลับไปใช้ข้อมูลจำลอง (mock) แทน
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const hasSupabase = Boolean(supabase);
