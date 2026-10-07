/**
 * Config-derived SVG def IDs for the avatar's identity layers.
 *
 * The identity-stability test strips ALL <defs> and compares the remaining
 * markup byte-for-byte across outfits. IDs derived from the CONFIG (not from
 * React's useId, which differs per render root) keep every `url(#…)` reference
 * deterministic — so gradients and soft filters can be used freely on identity
 * layers without breaking the test. In production, duplicate IDs across avatar
 * instances are harmless because same-config defs are identical.
 */
const hx = (hex: string) => hex.replace('#', '').toLowerCase();

/** Horizontal cylinder shading for limbs/torso/neck/ears. */
export const skinCylId = (skin: string) => `vss-sc-${hx(skin)}`;
/** Radial photographic form for the face. */
export const faceId = (skin: string) => `vss-fc-${hx(skin)}`;
/** Vertical volume for hair masses. */
export const hairId = (color: string) => `vss-hc-${hx(color)}`;
/** Vertical volume for lips. */
export const lipId = (color: string) => `vss-lp-${hx(color)}`;
/** Radial iris with limbal ring. */
export const irisId = (color: string) => `vss-ir-${hx(color)}`;

/** Fabric cylinder shading for garments (defined per garment instance). */
export const fabricId = (uid: string, garmentId: string) => `vss-fb-${uid}-${garmentId}`;

/** Constant soft-focus filters (identical defs everywhere — safe to share). */
export const SOFT = 'vss-soft';
export const SOFT6 = 'vss-soft6';
