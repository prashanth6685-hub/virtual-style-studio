import { Link } from 'react-router-dom';

const CTAS = [
  { to: '/start', title: 'Create My Look', desc: 'Pick who you are styling and start mixing outfits', icon: '✨' },
  { to: '/start?method=photo', title: 'Try With My Photo', desc: 'Upload a photo and see clothes on you', icon: '📸' },
  { to: '/start?method=avatar', title: 'Create an Avatar', desc: 'Build a stylized you, no photo needed', icon: '🧑‍🎨' },
  { to: '/styles', title: 'Explore Styles', desc: 'Browse curated looks for every occasion', icon: '👗' },
];

const EXAMPLES = [
  { src: '/examples/woman-summer-dress.jpg', alt: 'Woman wearing a summer dress', label: 'Summer dress' },
  { src: '/examples/man-smart-casual.jpg', alt: 'Man in a smart casual outfit', label: 'Smart casual' },
  { src: '/examples/boy-kurta.jpg', alt: 'Boy wearing a kurta', label: 'Kurta look' },
  { src: '/examples/woman-saree.jpg', alt: 'Woman wearing a saree', label: 'Saree' },
];

const FEATURES = [
  { icon: '📸', title: 'Your photo, your fit', desc: 'Upload a photo or generate a model and preview outfits instantly.' },
  { icon: '🧑‍🎨', title: 'Parametric avatars', desc: 'Design a stylized avatar with full control — skin, hair, face, body.' },
  { icon: '🎨', title: 'Colors & patterns', desc: 'Recolor any garment from curated palettes, add stripes, dots or plaid.' },
  { icon: '🪄', title: 'Outfit generator', desc: 'Tell us the occasion and weather — get a complete look in seconds.' },
  { icon: '🖼️', title: 'Save & compare', desc: 'Keep your favorite looks and compare up to four side by side.' },
  { icon: '🔒', title: 'Private by design', desc: 'Your photos are yours. Store them or delete them anytime.' },
];

export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero */}
      <section className="card overflow-hidden !p-0">
        <div className="bg-ink-950 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand-300">
            Virtual Style Studio
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Try It. Style It. <span className="text-brand-300">Love It.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-200">
            Create your look and see how different clothes, colors, and styles look on you
            before you buy.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CTAS.map((c) => (
              <Link
                key={c.to + c.title}
                to={c.to}
                className="btn-accent !min-h-[56px] !justify-start !px-5 !text-left"
              >
                <span aria-hidden="true" className="text-2xl">
                  {c.icon}
                </span>
                <span>
                  <span className="block text-base font-bold">{c.title}</span>
                  <span className="block text-xs font-medium opacity-80">{c.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Example looks */}
      <section className="mt-10" aria-labelledby="examples-heading">
        <h2 id="examples-heading" className="mb-4 font-display text-2xl font-bold text-ink-950">
          Example looks
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EXAMPLES.map((e) => (
            <figure key={e.src} className="card overflow-hidden !p-0">
              <img
                src={e.src}
                alt={e.alt}
                loading="lazy"
                className="aspect-[3/4] w-full bg-ink-100 object-cover"
                onError={(ev) => {
                  (ev.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <figcaption className="px-3 py-2 text-center text-sm font-semibold text-ink-700">
                {e.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mt-10" aria-labelledby="features-heading">
        <h2 id="features-heading" className="mb-4 font-display text-2xl font-bold text-ink-950">
          Why you'll love it
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <div className="mb-2 text-3xl" aria-hidden="true">
                {f.icon}
              </div>
              <h3 className="font-bold text-ink-900">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy note */}
      <section className="card mt-10 border-brand-200 bg-brand-50" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="flex items-center gap-2 font-bold text-ink-900">
          <span aria-hidden="true">🔒</span> Your privacy comes first
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Your photo is used only to create your virtual try-on. You control whether it is
          stored or deleted — nothing is ever used for anything else.{' '}
          <Link to="/privacy" className="font-bold text-brand-600 underline">
            Read our privacy promise
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-10 border-t border-ink-100 pt-6 text-center text-sm text-ink-400">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/privacy" className="font-semibold hover:text-ink-700">
            Privacy
          </Link>
          <Link to="/profile" className="font-semibold hover:text-ink-700">
            Profile
          </Link>
          <span aria-hidden="true">·</span>
          <span>Virtual Style Studio — Phase 1 MVP</span>
        </div>
      </footer>
    </div>
  );
}
