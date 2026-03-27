import axios from 'axios'
import axiosRetry from 'axios-retry'
import { env } from '../../config/env'

// Configure robust retry logic for Instagram API
axiosRetry(axios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  }
})

const FB_GRAPH = 'https://graph.facebook.com/v19.0'
const IG_OAUTH = 'https://api.instagram.com/oauth'

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
}

class InstagramClient {
  /* ---------------- OAuth ---------------- */

  getAuthUrl(appId?: string, redirectUri?: string, state?: string) {
    const params = new URLSearchParams({
      client_id: appId || env.IG_CLIENT_ID,
      redirect_uri: redirectUri || env.IG_REDIRECT_URI,
      scope: 'instagram_basic,pages_show_list,pages_read_engagement',
      response_type: 'code',
      state: state || ''
    })

    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  }

  // Exchange code for short-lived user access token
  async getShortLivedToken(clientId: string, clientSecret: string, redirectUri: string, code: string) {
    const { data } = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token`,
      {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code
        }
      }
    )
    return data // { access_token, token_type, expires_in }
  }

  // Exchange short-lived token for long-lived token
  async getLongLivedToken(clientSecret: string, shortLivedToken: string) {
    const { data } = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token`, 
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: `client_${env.IG_CLIENT_ID}`,
          client_secret: clientSecret,
          fb_exchange_token: shortLivedToken
        }
      }
    )
    return data // { access_token, token_type, expires_in }
  }

  async refreshLongLivedToken(accessToken: string) {
    const { data } = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: env.IG_CLIENT_ID,
          client_secret: env.IG_CLIENT_SECRET,
          fb_exchange_token: accessToken
        }
      }
    )
    return data
  }

  /* -------- Resolve IG Business Account -------- */

  async getUserProfile(accessToken: string) {
    // For Graph API, we get the "me" object which is the Facebook User
    const { data } = await axios.get(`${FB_GRAPH}/me`, {
      params: { access_token: accessToken, fields: 'id,name' }
    })
    
    // We can also try to get the IG Business account here if we want to return that info
    try {
      const igId = await this.getInstagramBusinessAccount(accessToken)
      const igProfile = await axios.get(`${FB_GRAPH}/${igId}`, {
        params: { access_token: accessToken, fields: 'username,name,profile_picture_url' }
      })
      return {
        id: igId,
        username: igProfile.data.username,
        name: igProfile.data.name,
        account_type: 'BUSINESS'
      }
    } catch (e) {
      // Fallback to FB user info if no IG connected yet (shouldn't happen in this flow usually)
      return {
        id: data.id,
        username: data.name,
        name: data.name,
        account_type: 'FACEBOOK' 
      }
    }
  }

  async getInstagramBusinessAccount(accessToken: string): Promise<string> {
    // Request pages AND their linked instagram accounts in one go
    const pagesRes = await axios.get(`${FB_GRAPH}/me/accounts`, {
      params: { 
        access_token: accessToken,
        fields: 'id,name,instagram_business_account'
      }
    })

    const pages = pagesRes.data?.data || []
    
    // Find the first page that has an instagram_business_account
    const validPage = pages.find((p: any) => p.instagram_business_account?.id)

    if (!validPage) {
       // Check permissions to give a better error message
       try {
         const permRes = await axios.get(`${FB_GRAPH}/me/permissions`, {
           params: { access_token: accessToken }
         })
         const perms = permRes.data?.data || []
         const pagesShowList = perms.find((p: any) => p.permission === 'pages_show_list' && p.status === 'granted')
         
         if (!pagesShowList) {
           throw new Error('Permission "pages_show_list" is missing. Please reconnect and ensure you allow access to your Facebook Pages.')
         }
       } catch (e: any) {
         // If we threw the permission error above, rethrow it
         if (e.message.includes('pages_show_list')) throw e
         // Otherwise ignore permission check errors and fall through
       }

       if (pages.length === 0) throw new Error('No Facebook Pages found. This usually happens if you didn\'t select your Facebook Page during the connection step. Please disconnect, reconnect, and ensure you select your Page (or "Select All").')
       const pageNames = pages.map((p: any) => p.name).join(', ')
       throw new Error(`No Instagram Business account linked to any of the found Facebook Pages (${pageNames}). Please link your Instagram account in Facebook Page Settings (Page Settings > Linked Accounts > Instagram).`)
    }

    return validPage.instagram_business_account.id
  }

  /* ---------------- Media ---------------- */

  async getRecentMedia(igUserId: string, accessToken: string, limit = 10): Promise<{ data: InstagramMedia[], paging?: any }> {
    const { data } = await axios.get(`${FB_GRAPH}/${igUserId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
        limit,
        access_token: accessToken
      }
    })

    return {
      data: Array.isArray(data?.data) ? data.data : [],
      paging: data?.paging
    }
  }
}

export const instagramClient = new InstagramClient()
