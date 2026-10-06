import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/studio', label: 'Try On', icon: '👗' },
  { to: '/create?method=avatar', label: 'Avatar', icon: '🧑‍🎨' },
  { to: '/styles', label: 'Outfits', icon: '✨' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

/** Mobile bottom navigation (hidden on desktop). */
export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
                isActive ? 'text-ink-950' : 'text-ink-400 hover:text-ink-600'
              }`
            }
          >
            <span aria-hidden="true" className="text-[22px] leading-none">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
