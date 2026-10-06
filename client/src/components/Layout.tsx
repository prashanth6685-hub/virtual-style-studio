import type { ReactNode } from 'react';
import BottomNav from './BottomNav';
import SideNav from './SideNav';
import { ToastHost } from './ui';

/** Responsive app shell: desktop left nav, mobile bottom nav + stacked content. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl gap-6 px-4 pb-24 pt-4 md:px-6 md:pb-10 md:pt-6">
      <SideNav />
      <main className="min-w-0 flex-1" id="main">
        {children}
      </main>
      <BottomNav />
      <ToastHost />
    </div>
  );
}
