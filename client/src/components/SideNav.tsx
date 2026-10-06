import { NavLink } from 'react-router-dom';
import { useApp } from '../state/AppContext';

const ITEMS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/start', label: 'New Look', icon: '➕' },
  { to: '/studio', label: 'Try On', icon: '👗' },
  { to: '/create?method=avatar', label: 'Avatar Studio', icon: '🧑‍🎨' },
  { to: '/styles', label: 'Explore Styles', icon: '✨' },
  { to: '/generator', label: 'Outfit Generator', icon: '🪄' },
  { to: '/looks', label: 'My Looks', icon: '🖼️' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

/** Desktop left navigation (hidden on mobile). */
export default function SideNav() {
  const { personType } = useApp();
  return (
    <nav aria-label="Primary" className="hidden w-60 shrink-0 flex-col gap-1 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-950 text-xl" aria-hidden="true">
          👗
        </span>
        <div>
          <div className="font-display text-base font-bold leading-tight text-ink-950">Virtual Style</div>
          <div className="font-display text-base font-bold leading-tight text-ink-950">Studio</div>
        </div>
      </div>
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition ${
              isActive ? 'bg-ink-950 text-white shadow-card' : 'text-ink-600 hover:bg-ink-100'
            }`
          }
        >
          <span aria-hidden="true" className="text-xl">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
      <div className="mt-auto px-2 pt-6 text-xs text-ink-400">
        Styling: <span className="font-bold capitalize text-ink-600">{personType}</span>
      </div>
    </nav>
  );
}
