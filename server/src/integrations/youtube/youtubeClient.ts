import axios from 'axios'
import axiosRetry from 'axios-retry'

// Configure robust retry logic for YouTube API
axiosRetry(axios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429 || error.response?.status === 403; // YouTube sometimes returns 403 for quota
  }
})

export interface YouTubeVideo {
  videoId: string
  title: string
  description?: string
  thumbnailUrl?: string
  publishedAt: string
}

type PlaylistItemsResponse = {
  items?: Array<{
    snippet?: {
      title?: string
      description?: string
      publishedAt?: string
      thumbnails?: Record<string, { url?: string }>
      resourceId?: { videoId?: string }
    }
    contentDetails?: {
      videoId?: string
      videoPublishedAt?: string
    }
  }>
}

class YouTubeClient {
  private base = 'https://www.googleapis.com/youtube/v3'

  videoUrl(videoId: string) {
    return `https://www.youtube.com/watch?v=${videoId}`
  }

  /**
   * Accepts:
   * - PLxxxx / UUxxxx / OLAK5uy_xxx
   * - Full URL like https://www.youtube.com/playlist?list=PLxxxx
   * Returns the playlist id only.
   */
  private normalizePlaylistId(input: string) {
    const raw = String(input || '').trim()
    if (!raw) return ''

    // If user pasted full URL, extract list=
    if (raw.includes('list=')) {
      try {
        const u = new URL(raw)
        const list = u.searchParams.get('list')
        return String(list || '').trim()
      } catch {
        // fallthrough if it's not a valid URL
      }
    }

    return raw
  }

  private pickBestThumb(thumbnails?: Record<string, { url?: string }>) {
    if (!thumbnails) return undefined
    // Prefer high > medium > default
    return (
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      Object.values(thumbnails).find(t => t?.url)?.url
    )
  }

  /**
   * ✅ API KEY MODE (public playlists only)
   * Uses: GET /playlistItems?part=snippet,contentDetails&playlistId=...&maxResults=...&key=...
   */
  async listPlaylistVideosWithApiKey(apiKey: string, playlistIdInput: string, limit = 10): Promise<YouTubeVideo[]> {
    const key = String(apiKey || '').trim()
    const playlistId = this.normalizePlaylistId(playlistIdInput)

    if (!key) throw new Error('Missing YouTube API key')
    if (!playlistId) throw new Error('Missing playlistId')

    const maxResults = Math.min(Math.max(Number(limit || 1), 1), 50)

    const { data } = await axios.get<PlaylistItemsResponse>(`${this.base}/playlistItems`, {
      params: {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults,
        key
      }
    })

    const items = Array.isArray(data?.items) ? data.items : []

    return items
      .map((it) => {
        const videoId =
          it?.contentDetails?.videoId ||
          it?.snippet?.resourceId?.videoId ||
          ''

        const publishedAt =
          it?.contentDetails?.videoPublishedAt ||
          it?.snippet?.publishedAt ||
          new Date().toISOString()

        return {
          videoId,
          title: String(it?.snippet?.title || ''),
          description: String(it?.snippet?.description || ''),
          thumbnailUrl: this.pickBestThumb(it?.snippet?.thumbnails),
          publishedAt: String(publishedAt)
        }
      })
      .filter(v => !!v.videoId)
  }

  /**
   * ✅ OAUTH MODE (private + uploads allowed)
   */
  async listPlaylistVideosWithOAuth(accessToken: string, playlistIdInput: string, limit = 10): Promise<YouTubeVideo[]> {
    const token = String(accessToken || '').trim()
    const playlistId = this.normalizePlaylistId(playlistIdInput)

    if (!token) throw new Error('Missing YouTube access token')
    if (!playlistId) throw new Error('Missing playlistId')

    const maxResults = Math.min(Math.max(Number(limit || 1), 1), 50)

    const { data } = await axios.get<PlaylistItemsResponse>(`${this.base}/playlistItems`, {
      params: {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const items = Array.isArray(data?.items) ? data.items : []

    return items
      .map((it) => {
        const videoId =
          it?.contentDetails?.videoId ||
          it?.snippet?.resourceId?.videoId ||
          ''

        const publishedAt =
          it?.contentDetails?.videoPublishedAt ||
          it?.snippet?.publishedAt ||
          new Date().toISOString()

        return {
          videoId,
          title: String(it?.snippet?.title || ''),
          description: String(it?.snippet?.description || ''),
          thumbnailUrl: this.pickBestThumb(it?.snippet?.thumbnails),
          publishedAt: String(publishedAt)
        }
      })
      .filter(v => !!v.videoId)
  }

  /**
   * For OAuth flows: resolve the channel uploads playlist id (UUxxxx...)
   */
  async getMyUploadsPlaylistId(accessToken: string): Promise<string> {
    const token = String(accessToken || '').trim()
    if (!token) throw new Error('Missing YouTube access token')

    const { data } = await axios.get(`${this.base}/channels`, {
      params: { part: 'contentDetails', mine: 'true' },
      headers: { Authorization: `Bearer ${token}` }
    })

    const ch = Array.isArray(data?.items) ? data.items[0] : null
    const uploads = ch?.contentDetails?.relatedPlaylists?.uploads
    if (!uploads) throw new Error('Unable to resolve uploads playlist (mine=true).')
    return String(uploads)
  }
}

export const youtubeClient = new YouTubeClient()
