export type YahooOAuthToken = {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  created_at: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const hasBuffer = typeof Buffer !== 'undefined'

function encodeBase64(input: string): string {
  if (hasBuffer) {
    return Buffer.from(input, 'utf-8').toString('base64')
  }
  const bytes = encoder.encode(input)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function decodeBase64(input: string): string {
  if (hasBuffer) {
    return Buffer.from(input, 'base64').toString('utf-8')
  }
  const binary = atob(input)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return decoder.decode(bytes)
}

export function encodeYahooToken(token: YahooOAuthToken): string {
  return encodeBase64(JSON.stringify(token))
}

export function decodeYahooToken(encoded: string): YahooOAuthToken | null {
  try {
    const parsed = JSON.parse(decodeBase64(encoded)) as YahooOAuthToken
    if (!parsed?.access_token || !parsed?.token_type) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function isTokenExpired(
  token: YahooOAuthToken,
  skewMs = 30_000,
): boolean {
  const expiresAt = token.created_at + token.expires_in * 1000
  return Date.now() + skewMs >= expiresAt
}

export function getCookieValue(
  cookieString: string | null | undefined,
  name: string,
): string | null {
  if (!cookieString) {
    return null
  }
  const parts = cookieString.split(';')
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) {
      return rest.join('=')
    }
  }
  return null
}
