import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './routes/Landing';
import Start from './routes/Start';
import Create from './routes/Create';
import Studio from './routes/Studio';
import Styles from './routes/Styles';
import Generator from './routes/Generator';
import Looks from './routes/Looks';
import Profile from './routes/Profile';
import Privacy from './routes/Privacy';
import { AuthPage } from './routes/Auth';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<Start />} />
        <Route path="/create" element={<Create />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/styles" element={<Styles />} />
        <Route path="/generator" element={<Generator />} />
        <Route path="/looks" element={<Looks />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
