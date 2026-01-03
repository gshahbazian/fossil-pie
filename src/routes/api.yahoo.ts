import { createFileRoute } from '@tanstack/react-router'
import { decodeYahooToken, getCookieValue } from '../lib/yahooAuth'

const DEFAULT_PATH = 'fantasy/v2/users;use_login=1?format=json'
const API_BASE = 'https://fantasysports.yahooapis.com/'

export const Route = createFileRoute('/api/yahoo')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const path = sanitizePath(url.searchParams.get('path') ?? DEFAULT_PATH)
        if (!path) {
          return new Response('Invalid path', { status: 400 })
        }

        const token = readAccessToken(request)
        if (!token) {
          return new Response('Missing Yahoo token', { status: 401 })
        }

        const upstreamUrl = new URL(path, API_BASE)
        const upstreamResponse = await fetch(upstreamUrl.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        const body = await upstreamResponse.text()
        const headers = new Headers()
        const contentType = upstreamResponse.headers.get('content-type')
        if (contentType) {
          headers.set('content-type', contentType)
        }

        return new Response(body, {
          status: upstreamResponse.status,
          headers,
        })
      },
    },
  },
})

function sanitizePath(path: string): string | null {
  const trimmed = path.trim()
  if (
    !trimmed ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return null
  }
  if (!trimmed.startsWith('fantasy/')) {
    return null
  }
  return trimmed
}

function readAccessToken(request: Request): string | null {
  const stored = getCookieValue(request.headers.get('cookie'), 'yahoo_oauth')
  if (!stored) {
    return null
  }
  const parsed = decodeYahooToken(decodeURIComponent(stored))
  return parsed?.access_token ?? null
}
