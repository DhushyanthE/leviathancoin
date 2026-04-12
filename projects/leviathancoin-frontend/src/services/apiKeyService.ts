/**
 * apiKeyService.ts — Frontend API Key Management Service
 *
 * Wraps every /api/keys endpoint on the Leviathan backend.
 * The active API key is kept in sessionStorage (cleared when the tab closes).
 */

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// ─── Session Storage Key ──────────────────────────────────────────────────────

const SESSION_KEY = 'lv_current_api_key'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiKeyRecord {
  id: string
  userId: string
  label: string
  truncated: string
  scopes: string[]
  rateLimit: number
  isActive: boolean
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  lastUsedAt: string | null
  totalRequests: number
}

export interface GenerateKeyResponse {
  success: boolean
  message: string
  apiKey: string // shown ONCE — store immediately
  keyInfo: ApiKeyRecord
}

export interface GenerateKeyPayload {
  userId: string
  label?: string
  scopes?: string[]
  rateLimit?: number
  expiresInDays?: number | null
}

export interface ScopeDescriptions {
  [scope: string]: string
}

export interface ScopesResponse {
  success: boolean
  scopes: string[]
  descriptions: ScopeDescriptions
}

export interface ValidateResponse {
  success: boolean
  message: string
  identity: {
    keyId: string
    userId: string
    scopes: string[]
    rateLimit: number
    remaining: number
  }
}

// ─── Internal Fetch Helper ────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  apiKey?: string,
): Promise<T> {
  const activeKey = apiKey || getStoredKey()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (activeKey) {
    headers['x-api-key'] = activeKey
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}: ${res.statusText}`)
  }

  return data as T
}

// ─── Session Storage Helpers ──────────────────────────────────────────────────

/** Save a raw API key into sessionStorage for the current session. */
export function storeKey(rawKey: string): void {
  sessionStorage.setItem(SESSION_KEY, rawKey)
}

/** Retrieve the currently active API key from sessionStorage. */
export function getStoredKey(): string | null {
  return sessionStorage.getItem(SESSION_KEY)
}

/** Clear the active API key from sessionStorage. */
export function clearStoredKey(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Generate a new API key.
 * Requires an existing master key (wildcard scope) to be active in session.
 * The returned `rawKey` must be saved immediately — it is never retrievable again.
 */
export async function generateApiKey(payload: GenerateKeyPayload): Promise<GenerateKeyResponse> {
  return apiFetch<GenerateKeyResponse>('/keys/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Validate the currently stored API key.
 * Use this to confirm a key is working after the user enters it.
 */
export async function validateApiKey(rawKey?: string): Promise<ValidateResponse> {
  return apiFetch<ValidateResponse>('/keys/validate', {}, rawKey)
}

/**
 * List all keys for a userId (shows only truncated identifiers/metadata).
 */
export async function listApiKeys(userId: string): Promise<{ success: boolean; count: number; keys: ApiKeyRecord[] }> {
  return apiFetch(`/keys/list/${encodeURIComponent(userId)}`)
}

/**
 * Fetch all available permission scopes and their descriptions.
 * Public endpoint — no auth required.
 */
export async function fetchScopes(): Promise<ScopesResponse> {
  return apiFetch<ScopesResponse>('/keys/scopes', { method: 'GET' }, '__none__')
}

/**
 * Soft-revoke a key by its UUID.
 */
export async function revokeApiKey(keyId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/keys/${encodeURIComponent(keyId)}/revoke`, { method: 'PATCH' })
}

/**
 * Re-activate a previously revoked API key. Requires wildcard scope.
 */
export async function activateApiKey(keyId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/keys/${encodeURIComponent(keyId)}/activate`, { method: 'PATCH' })
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const apiKeyService = {
  storeKey,
  getStoredKey,
  clearStoredKey,
  generateApiKey,
  validateApiKey,
  listApiKeys,
  fetchScopes,
  revokeApiKey,
  activateApiKey,
}

export default apiKeyService
