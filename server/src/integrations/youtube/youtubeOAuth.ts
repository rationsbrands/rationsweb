import axios from 'axios'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'

export const YT_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly'
].join(' ')

export function getYouTubeAuthUrl(clientId: string, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: process.env.YT_SCOPE || '',
    access_type: process.env.YT_ACCESS_TYPE || '',
    prompt: process.env.YT_PROMPT || '',
    include_granted_scopes: 'true',
    state
  })
  return `${GOOGLE_AUTH}?${params.toString()}`
}

export async function exchangeYouTubeCode(opts: {
  clientId: string
  clientSecret: string
  redirectUri: string
  code: string
}) {
  const { data } = await axios.post(
    GOOGLE_TOKEN,
    new URLSearchParams({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: 'authorization_code',
      code: opts.code
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) || '',
    expiresIn: Number(data.expires_in || 3600)
  }
}

export async function refreshYouTubeToken(opts: {
  clientId: string
  clientSecret: string
  refreshToken: string
}) {
  const { data } = await axios.post(
    GOOGLE_TOKEN,
    new URLSearchParams({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: opts.refreshToken
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  return {
    accessToken: data.access_token as string,
    expiresIn: Number(data.expires_in || 3600)
  }
}
