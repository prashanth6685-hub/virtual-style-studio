import { Link } from 'react-router-dom';
import { PageTitle } from '../components/ui';

/** /privacy — plain-language privacy promise. */
export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Privacy" sub="Our promise, in plain language." />
      <div className="card space-y-5 text-[15px] leading-relaxed text-ink-700">
        <section>
          <h2 className="mb-1 font-bold text-ink-950">📸 Your photos</h2>
          <p>
            Your photo is used <strong>only</strong> to create your virtual try-on. You decide
            whether it is stored or deleted — use <strong>Profile → Delete my photos</strong> at
            any time. We never sell your photos, never use them for advertising, and never use
            them to train AI models.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-bold text-ink-950">🤖 AI-generated images</h2>
          <p>
            AI people and try-on results are generated on demand for you. They are private to
            you, served from unguessable URLs, and deleted when you delete them.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-bold text-ink-950">🧒 Children</h2>
          <p>
            No account is needed to use this site — just open it and start styling. For
            under-13s we collect minimal data and never do marketing.
            Kids' catalogs are automatically filtered to modest, age-appropriate clothing.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-bold text-ink-950">🗑️ Deletion</h2>
          <p>
            <strong>Delete my photos</strong> removes every uploaded image. <strong>Delete my
            data</strong> removes everything — avatars, looks, measurements and preferences.
            Deletion is immediate and permanent.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-bold text-ink-950">🔐 Security</h2>
          <p>
            Sessions live in secure httpOnly cookies, and every request is scoped so you
            can only ever touch your own data.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-bold text-ink-950">📊 What we don't do</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>No sexualized content, ever — generation prompts enforce modest, fully-clothed output.</li>
            <li>We never infer or label sensitive attributes (age, ethnicity, health) from your photos.</li>
            <li>No third-party ad trackers.</li>
          </ul>
        </section>
        <p className="text-sm text-ink-400">
          Questions? Manage everything from <Link to="/profile" className="font-bold text-brand-600 underline">your profile</Link>.
        </p>
      </div>
    </div>
  );
}
