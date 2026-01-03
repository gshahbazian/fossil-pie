import { createFileRoute } from '@tanstack/react-router'
import { encodeYahooToken, getCookieValue } from '../lib/yahooAuth'

export const Route = createFileRoute('/api/auth')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const clientId = process.env.YAHOO_CLIENT_ID
        const clientSecret = process.env.YAHOO_CLIENT_SECRET
        const redirectUri = resolveRedirectUri(
          request,
          url,
          process.env.YAHOO_REDIRECT_URI,
        )

        if (!clientId || !clientSecret || !redirectUri) {
          return redirectWithError('/?auth_error=missing_config', [
            clearCookie(STATE_COOKIE),
          ])
        }

        if (!code) {
          const nextState = createState()
          const authUrl = new URL(
            'https://api.login.yahoo.com/oauth2/request_auth',
          )
          authUrl.searchParams.set('client_id', clientId)
          authUrl.searchParams.set('redirect_uri', redirectUri)
          authUrl.searchParams.set('response_type', 'code')
          authUrl.searchParams.set('state', nextState)
          console.log('Yahoo OAuth redirect_uri', redirectUri)

          return redirectWithHeaders(authUrl.toString(), [
            buildCookie(STATE_COOKIE, nextState, { maxAge: 300 }),
          ])
        }

        const storedState = getCookieValue(
          request.headers.get('cookie'),
          STATE_COOKIE,
        )
        const decodedState = storedState
          ? decodeURIComponent(storedState)
          : null
        if (!state || !decodedState || decodedState !== state) {
          return redirectWithError('/?auth_error=state_mismatch', [
            clearCookie(STATE_COOKIE),
          ])
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
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
              code,
            }),
          },
        )

        if (!tokenResponse.ok) {
          return redirectWithError('/?auth_error=token_exchange_failed', [
            clearCookie(STATE_COOKIE),
          ])
        }

        const tokenPayload = (await tokenResponse.json()) as {
          access_token: string
          refresh_token?: string
          expires_in: number | string
          token_type: string
        }

        const cookiePayload = encodeYahooToken({
          ...tokenPayload,
          expires_in: Number(tokenPayload.expires_in ?? 0),
          created_at: Date.now(),
        })

        return redirectWithHeaders('/', [
          clearCookie(STATE_COOKIE),
          buildCookie(AUTH_COOKIE, cookiePayload, {
            maxAge: 60 * 60 * 24 * 30,
          }),
        ])
      },
    },
  },
})

const AUTH_COOKIE = 'yahoo_oauth'
const STATE_COOKIE = 'oauth_state'

function createState(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function encodeBasicAuth(clientId: string, clientSecret: string): string {
  const value = `${clientId}:${clientSecret}`
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64')
  }
  return btoa(value)
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

function clearCookie(name: string): string {
  return `${name}=; Path=/; SameSite=Lax; Secure; Max-Age=0`
}

function redirectWithHeaders(location: string, cookies: string[]): Response {
  const headers = new Headers({ Location: location })
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie)
  }
  return new Response(null, { status: 303, headers })
}

function redirectWithError(location: string, cookies: string[]): Response {
  return redirectWithHeaders(location, cookies)
}

function resolveRedirectUri(
  request: Request,
  url: URL,
  envValue: string | undefined,
): string | null {
  if (envValue) {
    if (!envValue.startsWith('https://')) {
      return null
    }
    return envValue
  }
  const host = request.headers.get('host') ?? url.host
  if (!host) {
    return null
  }
  const hostname = host.split(':')[0]
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  ) {
    return 'https://localhost:3000/api/auth'
  }
  return `https://${host}/api/auth`
}
