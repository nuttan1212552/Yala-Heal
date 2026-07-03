import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchDonations, insertDonation, MOCK_DONATIONS } from '../lib/db';

const AppContext = createContext(null);

function readPdpa() {
  try { return localStorage.getItem('yh_pdpa') === '1'; } catch { return false; }
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

  const value = {
    toast, showToast,
    pdpaAccepted, acceptPdpa, declinePdpa,
    donations, addDonation,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
