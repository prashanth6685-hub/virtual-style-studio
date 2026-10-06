import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AppProvider } from '../state/AppContext';

function renderApp(path: string) {
  // Hermetic: auth check always "not logged in".
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: { code: 'unauthorized', message: 'Nope' } }),
      text: async () => '',
    })),
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('landing route smoke render', () => {
  it('renders the headline, subheading and four CTAs at /', () => {
    renderApp('/');
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { name: /try it\. style it\. love it\./i })).toBeInTheDocument();
    expect(
      main.getByText(/see how different clothes, colors, and styles look on you before you buy/i),
    ).toBeInTheDocument();
    for (const label of ['Create My Look', 'Try With My Photo', 'Create an Avatar', 'Explore Styles']) {
      expect(main.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('renders the example gallery and privacy note', () => {
    renderApp('/');
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { name: /example looks/i })).toBeInTheDocument();
    expect(main.getByRole('link', { name: /privacy promise/i })).toBeInTheDocument();
  });

  it('redirects unknown routes home', () => {
    renderApp('/nope-not-real');
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { name: /try it\. style it\. love it\./i })).toBeInTheDocument();
  });
});
