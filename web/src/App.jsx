import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Sos from './pages/Sos';
import Mind from './pages/Mind';
import Share from './pages/Share';
import Relief from './pages/Relief';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="sos" element={<Sos />} />
        <Route path="mind-talk" element={<Mind />} />
        <Route path="share" element={<Share />} />
        <Route path="relief" element={<Relief />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
