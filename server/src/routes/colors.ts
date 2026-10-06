import { Router } from 'express';
import { matchColors, normalizeHex, PALETTE } from '@vss/shared';

const router = Router();

/** GET /api/colors/palette — named palettes grouped per spec section 10. */
router.get('/palette', (_req, res) => {
  res.json({ palette: PALETTE });
});

/**
 * GET /api/colors/match?hex=1a2b4c — complementary color suggestions
 * (static color-theory map, no AI).
 */
router.get('/match', (req, res) => {
  const hex = req.query.hex;
  if (typeof hex !== 'string' || hex.length === 0) {
    res.status(400).json({
      error: { code: 'VALIDATION', message: 'Query param "hex" is required, e.g. ?hex=1a2b4c' },
    });
    return;
  }
  let normalized: string;
  try {
    normalized = normalizeHex(hex.startsWith('#') ? hex : `#${hex}`);
  } catch {
    res.status(400).json({
      error: { code: 'VALIDATION', message: `"${hex}" is not a valid hex color` },
    });
    return;
  }
  res.json({ base: normalized, matches: matchColors(normalized) });
});

export default router;
