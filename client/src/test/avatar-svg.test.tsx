import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AvatarSVG from '../avatar/AvatarSVG';
import { defaultAvatarConfig } from '../avatar/avatarDefaults';
import type { GarmentRef } from '@vss/shared';

afterEach(cleanup);

function stripToIdentity(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-garment]').forEach((n) => n.remove());
  clone.querySelectorAll('defs').forEach((n) => n.remove());
  return clone.innerHTML;
}

const cw = (base: string, pattern = 'solid'): GarmentRef['colorway'] => ({
  base,
  pattern,
  material: 'cotton',
});

describe('AvatarSVG identity stability', () => {
  it('keeps face/skin/hair/body identical when clothing changes', () => {
    const config = defaultAvatarConfig('woman');
    const outfitA: GarmentRef[] = [
      { garmentId: 'tshirt', colorway: cw('#ff0000') },
      { garmentId: 'jeans', colorway: cw('#0000ff') },
    ];
    const outfitB: GarmentRef[] = [
      { garmentId: 'hoodie', colorway: cw('#00ff00', 'stripes') },
      { garmentId: 'skirt', colorway: cw('#ffff00', 'dots') },
      { garmentId: 'sunglasses', colorway: cw('#111111') },
    ];
    const a = render(<AvatarSVG config={config} outfit={outfitA} />);
    const b = render(<AvatarSVG config={config} outfit={outfitB} />);
    expect(stripToIdentity(a.container)).toBe(stripToIdentity(b.container));
    cleanup();
  });

  it('paints each garment onto its own layer', () => {
    const { container } = render(
      <AvatarSVG
        config={defaultAvatarConfig('man')}
        outfit={[
          { garmentId: 'tshirt', colorway: cw('#ffffff') },
          { garmentId: 'jeans', colorway: cw('#3b5b8c') },
          { garmentId: 'sneakers', colorway: cw('#ffffff') },
          { garmentId: 'watch', colorway: cw('#333333') },
        ]}
      />,
    );
    for (const id of ['tshirt', 'jeans', 'sneakers', 'watch']) {
      expect(
        container.querySelector(`[data-garment="${id}"]`),
        `expected garment layer ${id}`,
      ).toBeTruthy();
    }
  });

  it('maps shared catalog ids to renderer garments', () => {
    const { container } = render(
      <AvatarSVG
        config={defaultAvatarConfig('woman')}
        outfit={[
          { garmentId: 'tank-top', colorway: cw('#ffffff') },
          { garmentId: 'casual-dress', colorway: cw('#ff0000') },
          { garmentId: 'saree', colorway: cw('#00ff00') },
        ]}
      />,
    );
    expect(container.querySelector('[data-garment="tanktop"]')).toBeTruthy();
    expect(container.querySelector('[data-garment="dress-casual"]')).toBeTruthy();
    expect(container.querySelector('[data-garment="dress-saree"]')).toBeTruthy();
  });

  it('renders all three poses and exposes an accessible label', () => {
    for (const pose of ['front', 'side', 'three-quarter'] as const) {
      const { container, unmount } = render(
        <AvatarSVG config={defaultAvatarConfig('boy')} pose={pose} title="Test avatar" />,
      );
      expect(screen.getByRole('img', { name: 'Test avatar' })).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
  });

  it('renders every person type without crashing', () => {
    for (const pt of ['man', 'woman', 'boy', 'girl'] as const) {
      const { unmount } = render(<AvatarSVG config={defaultAvatarConfig(pt)} />);
      unmount();
    }
  });
});
