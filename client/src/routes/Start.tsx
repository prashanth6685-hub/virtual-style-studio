import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import type { PersonType } from '@vss/shared';
import { PageTitle } from '../components/ui';

const CARDS: { id: PersonType; label: string; emoji: string; desc: string }[] = [
  { id: 'man', label: 'Man', emoji: '👨', desc: 'Adult menswear' },
  { id: 'woman', label: 'Woman', emoji: '👩', desc: 'Adult womenswear' },
  { id: 'boy', label: 'Boy', emoji: '👦', desc: 'Kids — modest styles only' },
  { id: 'girl', label: 'Girl', emoji: '👧', desc: 'Kids — modest styles only' },
];

export default function Start() {
  const { setPersonType } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const method = params.get('method');

  const choose = (pt: PersonType) => {
    setPersonType(pt);
    navigate(method ? `/create?method=${method}` : '/create');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Who are you styling?" sub="Pick one — we'll tailor the catalog, fits and styles to match." />
      <div className="grid grid-cols-2 gap-4" role="list">
        {CARDS.map((c) => (
          <button
            key={c.id}
            role="listitem"
            onClick={() => choose(c.id)}
            aria-label={`Style for ${c.label}`}
            className="card group flex min-h-[150px] flex-col items-center justify-center gap-2 text-center transition hover:-translate-y-0.5 hover:shadow-pop"
          >
            <span aria-hidden="true" className="text-6xl transition group-hover:scale-110">
              {c.emoji}
            </span>
            <span className="text-xl font-bold text-ink-950">{c.label}</span>
            <span className="text-xs text-ink-400">{c.desc}</span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-ink-400">
        You can change this anytime from the studio.
      </p>
    </div>
  );
}
