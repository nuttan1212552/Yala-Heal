import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Header from './Header';
import Footer from './Footer';
import Toast from './Toast';
import PdpaBanner from './PdpaBanner';
import InAppBrowserBanner from './InAppBrowserBanner';

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { /* noop */ }
  }, [location.pathname]);

  return (
    <div lang="th" style={{ color: '#17233A', minHeight: '100%' }}>
      <TopBar />
      <InAppBrowserBanner />
      <Header navOpen={navOpen} toggleNav={() => setNavOpen((v) => !v)} />
      <Outlet />
      <Footer />
      <PdpaBanner />
      <Toast />
    </div>
  );
}
