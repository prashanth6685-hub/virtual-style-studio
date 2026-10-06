/**
 * Typed fetch client for the Virtual Style Studio API.
 * Domain types come from `@vss/shared`; all requests send cookies
 * (the JWT lives in an httpOnly cookie).
 */
import type {
  AvatarConfig as SharedAvatarConfig,
  CatalogResponse,
  GeneratedPerson,
  JobResult,
  ModelRef,
  Outfit,
  PeopleJobResponse,
  PublicUser,
  SuggestRequest,
  SuggestResponse,
  TryOnRequest,
  TryOnResponse,
} from '@vss/shared';
import { matchColors as sharedMatchColors, type ColorMatch } from '@vss/shared';
import type { AvatarConfig } from '../avatar/types';

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Base URL of the API: same-origin by default, override with VITE_API_URL. */
export function apiBase(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

/** Join the base with an `/api/...` path. Exported for tests. */
export function buildUrl(path: string): string {
  const base = apiBase().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** skip JSON content-type (for FormData) */
  raw?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, raw, signal } = options;
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (raw) payload = body as BodyInit;
    else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }
  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method,
      headers,
      body: payload,
      credentials: 'include',
      signal,
    });
  } catch {
    throw new ApiError(0, 'Network error — is the server running?');
  }
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data: unknown = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => '');
  if (!res.ok) {
    const err = data as { error?: { message?: string } | string; message?: string } | null;
    const message =
      (typeof err?.error === 'object' ? err.error.message : err?.error) ??
      err?.message ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

const get = <T,>(path: string, signal?: AbortSignal) => request<T>(path, { signal });
const post = <T,>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body });
const put = <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body });
const del = <T,>(path: string) => request<T>(path, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Local DTOs (not in shared — client/server record shapes)
// ---------------------------------------------------------------------------

export interface UploadedImage {
  id: string;
  filename: string;
  url: string;
  mime: string;
  size: number;
  purpose: string;
  createdAt: string;
}

export interface AvatarDto {
  id: string;
  name: string;
  personType: string;
  /** rich client-side parametric config (stored as JSON server-side) */
  config: AvatarConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SavedLook {
  id: string;
  name: string;
  outfit: Outfit;
  resultImageUrl?: string | null;
  modelRef: ModelRef;
  createdAt: string;
}

export interface Measurement {
  heightCm?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  shoulderCm?: number | null;
  inseamCm?: number | null;
}

export interface HealthStatus {
  ok: boolean;
  provider: string;
  email: boolean;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const signup = (email: string, password: string) =>
  post<PublicUser>('/api/auth/signup', { email, password });

export const login = (email: string, password: string) =>
  post<PublicUser>('/api/auth/login', { email, password });

export const guest = () => post<PublicUser>('/api/auth/guest');

export const logout = () => post<void>('/api/auth/logout');

export const me = () => get<PublicUser>('/api/auth/me');

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export async function uploadPhoto(file: File, purpose = 'tryon'): Promise<UploadedImage> {
  const form = new FormData();
  form.append('photo', file);
  form.append('purpose', purpose);
  return request<UploadedImage>('/api/uploads/photo', { method: 'POST', body: form, raw: true });
}

export const deleteUpload = (id: string) => del<void>(`/api/uploads/${id}`);

// ---------------------------------------------------------------------------
// AI + jobs
// ---------------------------------------------------------------------------

export interface PersonFilters {
  ageGroup?: string;
  skinTone?: number;
  hairColor?: string;
  hairStyle?: string;
  bodyType?: string;
}

export const generatePeople = (filters: PersonFilters = {}, count = 8) =>
  post<PeopleJobResponse>('/api/ai/people', { filters, count });

export const getJob = (jobId: string) => get<JobResult>(`/api/ai/jobs/${jobId}`);

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (job: JobResult) => void;
  signal?: AbortSignal;
}

/** Poll a job until it reaches done/failed. Resolves with the job's result. */
export async function pollJob<T = unknown>(jobId: string, options: PollOptions = {}): Promise<T> {
  const { intervalMs = 1200, timeoutMs = 120_000, onProgress, signal } = options;
  const started = Date.now();
  for (;;) {
    if (signal?.aborted) throw new ApiError(0, 'Polling cancelled');
    const job = await getJob(jobId);
    onProgress?.(job);
    if (job.status === 'done') return job.result as T;
    if (job.status === 'failed') throw new ApiError(422, job.error || 'AI job failed', job);
    if (Date.now() - started > timeoutMs) throw new ApiError(408, 'Timed out waiting for the AI result');
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, intervalMs);
      signal?.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new ApiError(0, 'Polling cancelled'));
      });
    });
  }
}

export type { GeneratedPerson, PublicUser, SuggestRequest, SuggestResponse };

// ---------------------------------------------------------------------------
// Try-on
// ---------------------------------------------------------------------------

export const tryOn = (input: TryOnRequest) => post<TryOnResponse>('/api/tryon', input);

// ---------------------------------------------------------------------------
// Catalog / outfits / colors
// ---------------------------------------------------------------------------

export const getCatalog = () => get<CatalogResponse>('/api/catalog');

export const suggestOutfit = (input: SuggestRequest) =>
  post<SuggestResponse>('/api/outfits/suggest', input);

export interface ColorMatchDto extends ColorMatch {}

/**
 * Complementary-color suggestions. Tries the server endpoint first (it may
 * carry curated data); falls back to the shared pure color-theory function
 * so the UI works offline and before the server is up.
 */
export async function matchColors(hex: string): Promise<ColorMatch[]> {
  try {
    return await get<ColorMatch[]>(`/api/colors/match?hex=${encodeURIComponent(hex.replace('#', ''))}`);
  } catch {
    return sharedMatchColors(hex);
  }
}

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

export const listAvatars = () => get<AvatarDto[]>('/api/avatars');

export const createAvatar = (name: string, personType: string, config: AvatarConfig) =>
  post<AvatarDto>('/api/avatars', {
    name,
    personType,
    config: config as unknown as SharedAvatarConfig,
  });

export const updateAvatar = (id: string, patch: Partial<{ name: string; config: AvatarConfig }>) =>
  put<AvatarDto>(`/api/avatars/${id}`, {
    ...patch,
    config: patch.config ? (patch.config as unknown as SharedAvatarConfig) : undefined,
  });

export const deleteAvatar = (id: string) => del<void>(`/api/avatars/${id}`);

// ---------------------------------------------------------------------------
// Looks
// ---------------------------------------------------------------------------

export const listLooks = () => get<SavedLook[]>('/api/looks');

export const createLook = (look: {
  name: string;
  outfit: Outfit;
  resultImageUrl?: string;
  modelRef: ModelRef;
}) => post<SavedLook>('/api/looks', look);

export const updateLook = (
  id: string,
  patch: Partial<{ name: string; outfit: Outfit; resultImageUrl: string; modelRef: ModelRef }>,
) => put<SavedLook>(`/api/looks/${id}`, patch);

export const deleteLook = (id: string) => del<void>(`/api/looks/${id}`);

// ---------------------------------------------------------------------------
// Profile extras
// ---------------------------------------------------------------------------

export const getMeasurements = () => get<Measurement>('/api/profile/measurements');
export const saveMeasurements = (m: Measurement) => put<Measurement>('/api/profile/measurements', m);
export const getStylePrefs = () => get<Record<string, unknown>>('/api/profile/style-prefs');
export const saveStylePrefs = (prefs: Record<string, unknown>) => put('/api/profile/style-prefs', prefs);
export const deleteMyPhotos = () => del<void>('/api/profile/photos');
export const deleteMyData = () => del<void>('/api/profile/data');

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const health = () => get<HealthStatus>('/api/health');
