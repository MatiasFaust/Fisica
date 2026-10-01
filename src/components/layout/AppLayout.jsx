import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-main">
        <Navbar onMenu={() => setMenuOpen(true)} />
        <main className="app-content" key={pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
