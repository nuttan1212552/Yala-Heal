import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchDonations, insertDonation, upsertProfile, saveProfileServer, fetchMe, apiLogout, lineLoginUrl, MOCK_DONATIONS } from '../lib/db';

const AppContext = createContext(null);

function readPdpa() {
  try { return localStorage.getItem('yh_pdpa') === '1'; } catch { return false; }
}

function readProfile() {
  try { return JSON.parse(localStorage.getItem('yh_profile') || 'null') || {}; } catch { return {}; }
}

export function AppProvider({ children }) {
  const [toast, setToast] = useState('');
  const toastN = useRef(0);

  const showToast = useCallback((msg) => {
    const n = ++toastN.current;
    setToast(msg);
    setTimeout(() => {
      if (toastN.current === n) setToast('');
    }, 2600);
  }, []);

  const [pdpaAccepted, setPdpaAccepted] = useState(readPdpa);
  const acceptPdpa = useCallback(() => {
    try { localStorage.setItem('yh_pdpa', '1'); } catch { /* noop */ }
    setPdpaAccepted(true);
    showToast('บันทึกความยินยอมแล้ว');
  }, [showToast]);
  const declinePdpa = useCallback(() => {
    setPdpaAccepted(true);
    showToast('รับทราบ · ระบบจะเก็บเฉพาะข้อมูลที่จำเป็นขั้นต่ำ');
  }, [showToast]);

  // เริ่มด้วยข้อมูลจำลอง แล้วโหลดจาก Supabase ทับ (ถ้าเชื่อมไว้)
  const [donations, setDonations] = useState(MOCK_DONATIONS);
  useEffect(() => {
    let alive = true;
    fetchDonations().then((rows) => { if (alive) setDonations(rows); });
    return () => { alive = false; };
  }, []);

  const addDonation = useCallback(async (item) => {
    // อัปเดตหน้าจอทันที (optimistic) แล้วค่อยบันทึกลงฐานข้อมูล
    const tempId = Date.now();
    setDonations((list) => [{ ...item, id: tempId }, ...list]);
    const saved = await insertDonation(item);
    if (saved && saved.id !== tempId) {
      setDonations((list) => list.map((d) => (d.id === tempId ? saved : d)));
    }
  }, []);

  useEffect(() => {
    document.title = 'Yala Heal · เทศบาลนครยะลา';
  }, []);

  // ---- โปรไฟล์กลาง (ลงทะเบียนครั้งเดียว ใช้ทั้งเว็บ) ----
  const [profile, setProfile] = useState(readProfile);
  const [auth, setAuth] = useState(null); // ตัวตนที่เซิร์ฟเวอร์ยืนยัน (จาก LINE) หรือ null
  const [authReady, setAuthReady] = useState(false);
  const authRef = useRef(null);
  const profileComplete = Boolean(profile.name && profile.phone);
  const loggedIn = Boolean(auth);

  const updateProfile = useCallback((patch) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem('yh_profile', JSON.stringify(next)); } catch { /* noop */ }
      upsertProfile(next);
      // ถ้าล็อกอินอยู่ เก็บโปรไฟล์ที่เซิร์ฟเวอร์ด้วย (ผูกกับ LINE ID = ลงทะเบียนครั้งเดียว)
      if (authRef.current) saveProfileServer(next);
      return next;
    });
  }, []);

  // เข้าสู่ระบบด้วย LINE (ประตูหลัก) — ไม่ต้องกรอกอะไรก่อน
  const login = useCallback(() => { window.location.href = lineLoginUrl(''); }, []);
  const logout = useCallback(async () => {
    await apiLogout();
    setAuth(null);
    showToast('ออกจากระบบแล้ว');
  }, [showToast]);

  // โหลดสถานะล็อกอินตอนเปิดเว็บ + ดึงโปรไฟล์เดิมกลับมา (ลงทะเบียนครั้งเดียว)
  useEffect(() => {
    let alive = true;
    fetchMe().then(({ auth: a, profile: serverProfile }) => {
      if (!alive) return;
      setAuth(a); authRef.current = a; setAuthReady(true);
      if (a && serverProfile && serverProfile.phone) {
        setProfile((prev) => {
          const next = { ...prev, ...Object.fromEntries(Object.entries(serverProfile).filter(([, v]) => v)) };
          try { localStorage.setItem('yh_profile', JSON.stringify(next)); } catch { /* noop */ }
          return next;
        });
      }
    });
    return () => { alive = false; };
  }, []);

  // กดเชื่อม LINE จากโปรไฟล์ — จำเบอร์ที่กำลังเชื่อมไว้ แล้วเด้งไปหน้า LINE
  const connectLineForProfile = useCallback((phone) => {
    const p = (phone || profile.phone || '').trim();
    if (!p) return;
    try { localStorage.setItem('yh_pending_line', p); } catch { /* noop */ }
    window.location.href = lineLoginUrl(p);
  }, [profile.phone]);

  // รับผลกลับจากการเข้าสู่ระบบ/เชื่อม LINE (?line=connected | ?login=ok | ?line=error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const line = params.get('line');
    const loginParam = params.get('login');
    if (!line && !loginParam) return;
    let pending = '';
    try { pending = localStorage.getItem('yh_pending_line') || ''; } catch { /* noop */ }
    if (line === 'connected') {
      if (pending) {
        updateProfile({ phone: pending, lineLinked: true });
        try { localStorage.removeItem('yh_pending_line'); } catch { /* noop */ }
      }
      showToast('เชื่อมต่อ LINE สำเร็จ! พร้อมรับแจ้งเตือนแล้ว');
    } else if (loginParam === 'ok') {
      showToast('เข้าสู่ระบบด้วย LINE สำเร็จ 🎉');
    } else if (line === 'error') {
      showToast('เชื่อมต่อ LINE ไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
    params.delete('line'); params.delete('login');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, [showToast, updateProfile]);

  const value = {
    toast, showToast,
    pdpaAccepted, acceptPdpa, declinePdpa,
    donations, addDonation,
    profile, profileComplete, updateProfile, connectLineForProfile,
    auth, loggedIn, authReady, login, logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
