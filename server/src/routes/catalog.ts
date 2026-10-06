import { Router } from 'express';
import { categoriesFor, CLOTHING_ITEMS, itemsFor } from '@vss/shared';
import type { CatalogCategory, PersonType } from '@vss/shared';

const router = Router();

/** GET /api/catalog — full clothing catalog JSON (from @vss/shared). */
router.get('/', (_req, res) => {
  const categories = [
    'tops',
    'bottoms',
    'dresses',
    'indian',
    'outerwear',
    'shoes',
    'accessories',
  ] as CatalogCategory[];
  res.json({ items: CLOTHING_ITEMS, categories });
});

/**
 * GET /api/catalog/items?personType=woman&category=tops
 * Convenience filter over the same catalog.
 */
router.get('/items', (req, res) => {
  const personType = req.query.personType as PersonType | undefined;
  const category = req.query.category as CatalogCategory | undefined;
  if (!personType || !['man', 'woman', 'boy', 'girl'].includes(personType)) {
    res.status(400).json({
      error: { code: 'VALIDATION', message: 'personType must be man|woman|boy|girl' },
    });
    return;
  }
  const items = category ? itemsFor(personType, category) : itemsFor(personType);
  res.json({ items, categories: categoriesFor(personType) });
});

export default router;
