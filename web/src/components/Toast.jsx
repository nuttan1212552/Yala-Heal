import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', zIndex: 200,
        background: '#122A4A', color: '#fff', padding: '14px 22px', borderRadius: 12,
        fontSize: 15, fontWeight: 500, boxShadow: '0 12px 30px -8px rgba(18,42,74,.5)',
        animation: 'toastIn .25s ease-out', maxWidth: '90vw', textAlign: 'center',
      }}
    >
      {toast}
    </div>
  );
}
