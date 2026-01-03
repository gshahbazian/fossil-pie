import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  decodeYahooToken,
  getCookieValue,
  isTokenExpired,
  type YahooOAuthToken,
} from '../lib/yahooAuth'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [token, setToken] = useState<YahooOAuthToken | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [apiResult, setApiResult] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    setToken(readYahooToken())
    const params = new URLSearchParams(window.location.search)
    setAuthError(params.get('auth_error'))
  }, [])

  const expired = token ? isTokenExpired(token) : true

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-4xl font-semibold">Fossil Pie</h1>
        <p className="text-slate-300">
          Connect Yahoo to fetch fantasy data. OAuth credentials are stored in a
          JS-readable cookie so the client can attach Bearer tokens.
        </p>
        {authError ? (
          <p className="text-rose-300">
            OAuth error: <span className="font-semibold">{authError}</span>
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex items-center justify-center rounded bg-slate-200 text-slate-900 px-4 py-2 font-medium"
            href="/api/auth"
          >
            Connect Yahoo
          </a>
          <button
            className="inline-flex items-center justify-center rounded border border-slate-700 px-4 py-2 text-slate-200 disabled:opacity-50"
            disabled={!token || isRefreshing}
            onClick={async () => {
              if (!token) {
                return
              }
              setIsRefreshing(true)
              try {
                await fetch('/api/auth/refresh', { method: 'POST' })
              } finally {
                setToken(readYahooToken())
                setIsRefreshing(false)
              }
            }}
            type="button"
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh token'}
          </button>
          <button
            className="inline-flex items-center justify-center rounded border border-slate-700 px-4 py-2 text-slate-200 disabled:opacity-50"
            disabled={!token || isTestingApi}
            onClick={async () => {
              if (!token) {
                return
              }
              setIsTestingApi(true)
              setApiError(null)
              setApiResult(null)
              try {
                const response = await fetch(
                  '/api/yahoo?path=fantasy/v2/users;use_login=1/games;game_keys=nba/leagues?format=json',
                  {
                    credentials: 'include',
                  },
                )
                const text = await response.text()
                if (!response.ok) {
                  setApiError(`HTTP ${response.status} ${response.statusText}`)
                }
                setApiResult(text)
              } catch (error) {
                setApiError(
                  error instanceof Error ? error.message : String(error),
                )
              } finally {
                setIsTestingApi(false)
              }
            }}
            type="button"
          >
            {isTestingApi ? 'Testing…' : 'Fetch Yahoo NBA leagues'}
          </button>
        </div>
        {apiError ? (
          <p className="text-rose-300 text-sm">API error: {apiError}</p>
        ) : null}
        {apiResult ? (
          <div className="rounded border border-slate-800 bg-slate-900 p-4 text-xs text-slate-300 overflow-auto max-h-64">
            <pre className="whitespace-pre-wrap">{apiResult}</pre>
          </div>
        ) : null}
        <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
          <p className="font-semibold">Token status</p>
          {token ? (
            <div className="mt-2 space-y-1 text-slate-300">
              <p>
                Expires:{' '}
                <span
                  className={expired ? 'text-rose-300' : 'text-emerald-300'}
                >
                  {expired ? 'expired' : 'active'}
                </span>
              </p>
              <p>Type: {token.token_type}</p>
              <p>Access token: {token.access_token.slice(0, 8)}…</p>
            </div>
          ) : (
            <p className="mt-2 text-slate-400">No token cookie found.</p>
          )}
        </div>
      </div>
    </main>
  )
}

function readYahooToken(): YahooOAuthToken | null {
  const raw = getCookieValue(document.cookie, 'yahoo_oauth')
  if (!raw) {
    return null
  }
  return decodeYahooToken(decodeURIComponent(raw))
}
