import { promises as fs } from 'fs'
import path from 'path'

export interface FileStorage {
  uploadFile(i: { path: string; contentType?: string; data: Buffer }): Promise<{ url: string }>
  getFileUrl(i: { path: string }): Promise<string>
  deleteFile(i: { path: string }): Promise<void>
}

const ROOT = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage')

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

function safeJoin(...parts: string[]) {
  const p = path.join(...parts)
  const norm = path.normalize(p)
  if (!norm.startsWith(ROOT)) throw new Error('Invalid path')
  return norm
}

class LocalStorage implements FileStorage {
  async uploadFile(i: { path: string; contentType?: string; data: Buffer }): Promise<{ url: string }> {
    const base = ROOT
    const abs = safeJoin(base, i.path)
    await ensureDir(path.dirname(abs))
    await fs.writeFile(abs, i.data)
    return { url: `file://${abs}` }
  }
  async getFileUrl(i: { path: string }): Promise<string> {
    const abs = safeJoin(ROOT, i.path)
    return `file://${abs}`
  }
  async deleteFile(i: { path: string }): Promise<void> {
    const abs = safeJoin(ROOT, i.path)
    await fs.unlink(abs).catch(() => {})
  }
}

export const storage: FileStorage = new LocalStorage()
