import { createFileRoute } from '@tanstack/react-router'
import {
  decodeYahooToken,
  encodeYahooToken,
  getCookieValue,
} from '../lib/yahooAuth'

export const Route = createFileRoute('/api/auth/refresh')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clientId = process.env.YAHOO_CLIENT_ID
        const clientSecret = process.env.YAHOO_CLIENT_SECRET

        if (!clientId || !clientSecret) {
          return new Response(null, { status: 500 })
        }

        const refreshToken =
          (await readRefreshToken(request)) ??
          readRefreshTokenFromCookie(request)

        if (!refreshToken) {
          return new Response(null, { status: 400 })
        }

        const tokenResponse = await fetch(
          'https://api.login.yahoo.com/oauth2/get_token',
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${encodeBasicAuth(clientId, clientSecret)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
            }),
          },
        )

        if (!tokenResponse.ok) {
          return new Response(null, { status: 502 })
        }

        const tokenPayload = (await tokenResponse.json()) as {
          access_token: string
          refresh_token?: string
          expires_in: number | string
          token_type: string
        }

        const cookiePayload = encodeYahooToken({
          ...tokenPayload,
          refresh_token: tokenPayload.refresh_token ?? refreshToken,
          expires_in: Number(tokenPayload.expires_in ?? 0),
          created_at: Date.now(),
        })

        const headers = new Headers()
        headers.append(
          'Set-Cookie',
          buildCookie('yahoo_oauth', cookiePayload, {
            maxAge: 60 * 60 * 24 * 30,
          }),
        )

        return new Response(null, { status: 204, headers })
      },
    },
  },
})

async function readRefreshToken(request: Request): Promise<string | null> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as {
      refresh_token?: string
      refreshToken?: string
    } | null
    return body?.refresh_token ?? body?.refreshToken ?? null
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const bodyText = await request.text()
    const params = new URLSearchParams(bodyText)
    return params.get('refresh_token')
  }
  return null
}

function readRefreshTokenFromCookie(request: Request): string | null {
  const stored = getCookieValue(request.headers.get('cookie'), 'yahoo_oauth')
  if (!stored) {
    return null
  }
  const decoded = decodeURIComponent(stored)
  const parsed = decodeYahooToken(decoded)
  return parsed?.refresh_token ?? null
}

function buildCookie(
  name: string,
  value: string,
  { maxAge }: { maxAge?: number },
): string {
  const encoded = encodeURIComponent(value)
  const parts = [`${name}=${encoded}`, 'Path=/', 'SameSite=Lax', 'Secure']
  if (typeof maxAge === 'number') {
    parts.push(`Max-Age=${maxAge}`)
  }
  return parts.join('; ')
}

function encodeBasicAuth(clientId: string, clientSecret: string): string {
  const value = `${clientId}:${clientSecret}`
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64')
  }
  return btoa(value)
}
