import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Mind from './pages/Mind';
import Share from './pages/Share';
import Relief from './pages/Relief';
import Onboarding from './pages/Onboarding';
import CivicWallet from './pages/CivicWallet';
import Payments from './pages/Payments';
import Staff from './pages/Staff';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="mind-talk" element={<Mind />} />
        <Route path="share" element={<Share />} />
        <Route path="relief" element={<Relief />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="civic-wallet" element={<CivicWallet />} />
        <Route path="payments" element={<Payments />} />
        <Route path="staff" element={<Staff />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
