/**
 * ApiKeyManager.tsx — Leviathan API Key Management Dashboard
 *
 * Panels:
 *  1. Authenticate  → enter a raw key, validate it, store in session
 *  2. Generate      → create a new scoped key (requires active master key)
 *  3. My Keys       → list + revoke keys for a userId
 *  4. Scopes        → reference table of all permission scopes
 */

import { useEffect, useState } from 'react'
import {
  type ApiKeyRecord,
  type GenerateKeyPayload,
  type ScopeDescriptions,
  apiKeyService,
} from '../services/apiKeyService'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ApiKeyManagerProps {
  closeModal: () => void
}

// ─── Scope badge colours ──────────────────────────────────────────────────────

const SCOPE_COLORS: Record<string, string> = {
  '*': 'bg-red-100 text-red-800 border-red-200',
  'dao:read': 'bg-blue-100 text-blue-800 border-blue-200',
  'dao:write': 'bg-blue-200 text-blue-900 border-blue-300',
  'staking:read': 'bg-green-100 text-green-800 border-green-200',
  'staking:write': 'bg-green-200 text-green-900 border-green-300',
  'mining:read': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'mining:write': 'bg-yellow-200 text-yellow-900 border-yellow-300',
  'token:read': 'bg-purple-100 text-purple-800 border-purple-200',
  'token:write': 'bg-purple-200 text-purple-900 border-purple-300',
  'nft:read': 'bg-pink-100 text-pink-800 border-pink-200',
  'nft:write': 'bg-pink-200 text-pink-900 border-pink-300',
  'bft:read': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'infra:read': 'bg-gray-100 text-gray-800 border-gray-200',
  'wallet:read': 'bg-orange-100 text-orange-800 border-orange-200',
}

function ScopeBadge({ scope }: { scope: string }) {
  const cls = SCOPE_COLORS[scope] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${cls}`}>
      {scope}
    </span>
  )
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

type AlertType = 'success' | 'error' | 'warning' | 'info'
interface AlertProps { type: AlertType; message: string }

const ALERT_STYLES: Record<AlertType, string> = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
}
const ALERT_ICONS: Record<AlertType, string> = {
  success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️',
}

function Alert({ type, message }: AlertProps) {
  return (
    <div className={`flex items-start gap-2 border rounded-lg p-3 text-sm ${ALERT_STYLES[type]}`}>
      <span>{ALERT_ICONS[type]}</span>
      <span className="break-all">{message}</span>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'auth' | 'generate' | 'mykeys' | 'scopes'

export default function ApiKeyManager({ closeModal }: ApiKeyManagerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('auth')

  // ── Shared Session State ──
  const [sessionKey, setSessionKey] = useState<string | null>(apiKeyService.getStoredKey())
  const [sessionIdentity, setSessionIdentity] = useState<{ userId: string; scopes: string[]; keyId: string } | null>(null)

  // ── Tab: Authenticate ──
  const [authInput, setAuthInput] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authAlert, setAuthAlert] = useState<AlertProps | null>(null)

  // ── Tab: Generate ──
  const [genUserId, setGenUserId] = useState('')
  const [genLabel, setGenLabel] = useState('')
  const [genScopes, setGenScopes] = useState<string[]>(['*'])
  const [genRate, setGenRate] = useState(100)
  const [genExpiry, setGenExpiry] = useState<number | ''>('')
  const [genLoading, setGenLoading] = useState(false)
  const [genAlert, setGenAlert] = useState<AlertProps | null>(null)
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [allScopes, setAllScopes] = useState<string[]>([])

  // ── Tab: My Keys ──
  const [listUserId, setListUserId] = useState('')
  const [userKeys, setUserKeys] = useState<ApiKeyRecord[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listAlert, setListAlert] = useState<AlertProps | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // ── Tab: Scopes ──
  const [scopeDescs, setScopeDescs] = useState<ScopeDescriptions>({})

  // ── Load scope list on mount ──
  useEffect(() => {
    apiKeyService
      .fetchScopes()
      .then((res) => {
        setAllScopes(res.scopes)
        setScopeDescs(res.descriptions)
      })
      .catch(() => {/* silently ignore — backend may be offline */})
  }, [])

  // ── Pre-fill userId fields from session ──
  useEffect(() => {
    if (sessionIdentity?.userId) {
      setListUserId(sessionIdentity.userId)
      setGenUserId(sessionIdentity.userId)
    }
  }, [sessionIdentity])

  // ─── Authenticate ───────────────────────────────────────────────────────────

  async function handleAuthenticate() {
    const key = authInput.trim()
    if (!key) return setAuthAlert({ type: 'error', message: 'Please paste your API key.' })

    setAuthLoading(true)
    setAuthAlert(null)
    try {
      const res = await apiKeyService.validateApiKey(key)
      apiKeyService.storeKey(key)
      setSessionKey(key)
      setSessionIdentity(res.identity)
      setAuthAlert({ type: 'success', message: `Authenticated as ${res.identity.userId} · ${res.identity.scopes.join(', ')}` })
      setAuthInput('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Validation failed'
      setAuthAlert({ type: 'error', message })
    } finally {
      setAuthLoading(false)
    }
  }

  function handleSignOut() {
    apiKeyService.clearStoredKey()
    setSessionKey(null)
    setSessionIdentity(null)
    setAuthAlert({ type: 'info', message: 'Signed out. Your API key has been cleared from this session.' })
  }

  // ─── Generate ───────────────────────────────────────────────────────────────

  function toggleScope(scope: string) {
    setGenScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  async function handleGenerate() {
    if (!genUserId.trim()) return setGenAlert({ type: 'error', message: 'userId is required.' })
    if (genScopes.length === 0) return setGenAlert({ type: 'error', message: 'Select at least one scope.' })

    setGenLoading(true)
    setGenAlert(null)
    setNewRawKey(null)
    setKeyCopied(false)
    try {
      const payload: GenerateKeyPayload = {
        userId: genUserId.trim(),
        label: genLabel.trim() || undefined,
        scopes: genScopes,
        rateLimit: genRate,
        expiresInDays: genExpiry === '' ? null : Number(genExpiry),
      }
      const res = await apiKeyService.generateApiKey(payload)
      setNewRawKey(res.apiKey)
      setGenAlert({ type: 'warning', message: '⚠️ Key generated! Copy it NOW — it will never be shown again.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      setGenAlert({ type: 'error', message })
    } finally {
      setGenLoading(false)
    }
  }

  function copyKey() {
    if (newRawKey) {
      navigator.clipboard.writeText(newRawKey)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 3000)
    }
  }

  // ─── My Keys ────────────────────────────────────────────────────────────────

  async function handleListKeys() {
    if (!listUserId.trim()) return setListAlert({ type: 'error', message: 'Enter a userId to look up.' })
    setListLoading(true)
    setListAlert(null)
    setUserKeys([])
    try {
      const res = await apiKeyService.listApiKeys(listUserId.trim())
      setUserKeys(res.keys)
      if (res.keys.length === 0) setListAlert({ type: 'info', message: 'No keys found for this userId.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list keys'
      setListAlert({ type: 'error', message })
    } finally {
      setListLoading(false)
    }
  }

  async function handleRevoke(keyId: string) {
    setRevokingId(keyId)
    try {
      await apiKeyService.revokeApiKey(keyId)
      setUserKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, isActive: false } : k)))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke'
      setListAlert({ type: 'error', message })
    } finally {
      setRevokingId(null)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const TAB_LABELS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'auth', label: 'Authenticate', emoji: '🔑' },
    { id: 'generate', label: 'Generate Key', emoji: '⚡' },
    { id: 'mykeys', label: 'Manage Keys', emoji: '🗂️' },
    { id: 'scopes', label: 'Scopes', emoji: '📋' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden w-full max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">🔐 API Key Manager</h2>
          <p className="text-slate-400 text-xs mt-0.5">Leviathan Backend · Secure Access Control</p>
        </div>
        <div className="flex items-center gap-3">
          {sessionKey && (
            <span className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 text-green-300 text-xs px-3 py-1 rounded-full font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {sessionIdentity?.userId ?? 'Authenticated'}
            </span>
          )}
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        {TAB_LABELS.map((t) => (
          <button
            key={t.id}
            id={`api-key-tab-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === t.id
                ? 'border-slate-800 text-slate-800 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Authenticate ── */}
      {activeTab === 'auth' && (
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Activate a Session Key</h3>
            <p className="text-sm text-gray-500">
              Paste your raw API key here. It will be stored in this browser tab only and cleared when you close it.
            </p>
          </div>

          {authAlert && <Alert {...authAlert} />}

          {!sessionKey ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="auth-key-input">
                  API Key
                </label>
                <input
                  id="auth-key-input"
                  type="password"
                  value={authInput}
                  onChange={(e) => setAuthInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
                  placeholder="lv_live_..."
                  className="w-full font-mono text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-gray-50"
                />
              </div>
              <button
                id="auth-validate-btn"
                onClick={handleAuthenticate}
                disabled={authLoading}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {authLoading ? <Spinner /> : '🔑'}
                {authLoading ? 'Validating…' : 'Authenticate'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {/* Identity Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Session</span>
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Connected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">User ID</div>
                    <div className="text-sm font-mono font-semibold text-gray-800 truncate">
                      {sessionIdentity?.userId ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Key ID</div>
                    <div className="text-sm font-mono text-gray-600 truncate">
                      {sessionIdentity?.keyId ?? '—'}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">Scopes</div>
                  <div className="flex flex-wrap gap-1">
                    {sessionIdentity?.scopes.map((s) => <ScopeBadge key={s} scope={s} />) ?? '—'}
                  </div>
                </div>
              </div>

              <button
                id="auth-signout-btn"
                onClick={handleSignOut}
                className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Generate ── */}
      {activeTab === 'generate' && (
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Generate a New API Key</h3>
            <p className="text-sm text-gray-500">
              Requires an authenticated <ScopeBadge scope="*" /> master key in session.
              The raw key is shown exactly once.
            </p>
          </div>

          {genAlert && <Alert {...genAlert} />}

          {/* New key reveal box */}
          {newRawKey && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg space-y-2">
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                ⚠️ Copy this key — it will never be shown again
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-white border border-amber-300 rounded px-3 py-2 break-all text-amber-900 select-all">
                  {newRawKey}
                </code>
                <button
                  id="gen-copy-key-btn"
                  onClick={copyKey}
                  className={`shrink-0 text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                    keyCopied ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {keyCopied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="gen-userid">
                User ID <span className="text-red-500">*</span>
              </label>
              <input
                id="gen-userid"
                type="text"
                value={genUserId}
                onChange={(e) => setGenUserId(e.target.value)}
                placeholder="wallet address or email"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="gen-label">
                Label <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="gen-label"
                type="text"
                value={genLabel}
                onChange={(e) => setGenLabel(e.target.value)}
                placeholder="e.g. CI Pipeline Key"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="gen-rate">
                Rate Limit <span className="text-gray-400 font-normal">(req/min)</span>
              </label>
              <input
                id="gen-rate"
                type="number"
                min={1}
                max={10000}
                value={genRate}
                onChange={(e) => setGenRate(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="gen-expiry">
                Expires In <span className="text-gray-400 font-normal">(days, blank = never)</span>
              </label>
              <input
                id="gen-expiry"
                type="number"
                min={1}
                value={genExpiry}
                onChange={(e) => setGenExpiry(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Never"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Scope grid */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Permission Scopes <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              {(allScopes.length > 0 ? allScopes : Object.keys(SCOPE_COLORS)).map((scope) => (
                <button
                  key={scope}
                  id={`gen-scope-${scope.replace(':', '-')}`}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-all ${
                    genScopes.includes(scope)
                      ? (SCOPE_COLORS[scope] ?? 'bg-slate-200 text-slate-800 border-slate-300') + ' ring-2 ring-slate-400 ring-offset-1'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Click to toggle scopes. <strong>*</strong> grants full access.
            </p>
          </div>

          <button
            id="gen-submit-btn"
            onClick={handleGenerate}
            disabled={genLoading || !sessionKey}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {genLoading ? <Spinner /> : '⚡'}
            {genLoading ? 'Generating…' : 'Generate Key'}
          </button>
          {!sessionKey && (
            <p className="text-xs text-red-500">Authenticate with a master key on the <strong>Authenticate</strong> tab first.</p>
          )}
        </div>
      )}

      {/* ── Tab: My Keys ── */}
      {activeTab === 'mykeys' && (
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Manage Keys</h3>
            <p className="text-sm text-gray-500">View and revoke API keys for a given userId.</p>
          </div>

          {listAlert && <Alert {...listAlert} />}

          {/* Search */}
          <div className="flex gap-2">
            <input
              id="mykeys-userid-input"
              type="text"
              value={listUserId}
              onChange={(e) => setListUserId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleListKeys()}
              placeholder="userId / wallet address"
              className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              id="mykeys-fetch-btn"
              onClick={handleListKeys}
              disabled={listLoading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {listLoading ? <Spinner /> : '🔍'}
              {listLoading ? 'Loading…' : 'Fetch'}
            </button>
          </div>

          {/* Keys table */}
          {userKeys.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Label / Key</th>
                    <th className="px-4 py-3 text-left">Scopes</th>
                    <th className="px-4 py-3 text-left">Usage</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userKeys.map((key) => (
                    <tr key={key.id} className={key.isActive ? '' : 'opacity-50'}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{key.label || 'Unnamed'}</div>
                        <div className="font-mono text-xs text-gray-400 mt-0.5">{key.truncated}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Created {new Date(key.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {key.scopes.map((s) => <ScopeBadge key={s} scope={s} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 font-semibold">{key.totalRequests.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">
                          {key.lastUsedAt
                            ? `Last: ${new Date(key.lastUsedAt).toLocaleDateString()}`
                            : 'Never used'}
                        </div>
                        <div className="text-xs text-gray-400">Limit: {key.rateLimit}/min</div>
                      </td>
                      <td className="px-4 py-3">
                        {key.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Revoked
                          </span>
                        )}
                        {key.expiresAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Exp: {new Date(key.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {key.isActive && (
                          <button
                            id={`revoke-btn-${key.id}`}
                            onClick={() => handleRevoke(key.id)}
                            disabled={revokingId === key.id}
                            className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {revokingId === key.id ? <Spinner /> : '🚫'}
                            {revokingId === key.id ? 'Revoking…' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Scopes ── */}
      {activeTab === 'scopes' && (
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Permission Scopes Reference</h3>
            <p className="text-sm text-gray-500">All available scopes for Leviathan API keys.</p>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(allScopes.length > 0 ? allScopes : Object.keys(SCOPE_COLORS)).map((scope) => (
                  <tr key={scope} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <ScopeBadge scope={scope} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {scopeDescs[scope] ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        scope === '*' ? 'text-red-600' :
                        scope.endsWith(':write') ? 'text-orange-600' :
                        'text-blue-600'
                      }`}>
                        {scope === '*' ? '🔴 Admin' : scope.endsWith(':write') ? '🟠 Write' : '🟢 Read-only'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-1">
            <strong>Security Tip:</strong>
            <ul className="list-disc list-inside space-y-1 mt-1 text-blue-700">
              <li>Grant only the minimum scopes a client needs.</li>
              <li>Reserve <code className="font-mono bg-blue-100 rounded px-1">*</code> (wildcard) for internal admin tooling.</li>
              <li>Set an expiry on keys used in automation pipelines.</li>
              <li>Never expose keys in client-side code or URLs.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
