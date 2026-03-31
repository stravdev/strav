import { extname } from 'node:path'
import { randomHex } from '../helpers/crypto.ts'
import OstraClient, { OstraError } from './ostra_client.ts'
import type { StorageDriver } from './types.ts'

export interface OstraDriverConfig {
  url: string
  token: string
  bucket: string
}

export default class OstraDriver implements StorageDriver {
  readonly client: OstraClient
  private bucket: string
  private baseUrl: string

  constructor(config: OstraDriverConfig) {
    this.client = new OstraClient({ url: config.url, token: config.token })
    this.bucket = config.bucket
    this.baseUrl = config.url.replace(/\/+$/, '')
  }

  async put(directory: string, file: File, name?: string): Promise<string> {
    const ext = extname(file.name)
    const filename = name ?? `${randomHex(8)}${ext}`
    const key = `${directory}/${filename}`

    await this.client.bucket(this.bucket).put(key, file, file.type)
    return key
  }

  async get(path: string): Promise<Blob | null> {
    try {
      return await this.client.bucket(this.bucket).get(path)
    } catch (e) {
      if (e instanceof OstraError && e.statusCode === 404) return null
      throw e
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.bucket(this.bucket).head(path)
      return true
    } catch (e) {
      if (e instanceof OstraError && e.statusCode === 404) return false
      throw e
    }
  }

  async delete(path: string): Promise<void> {
    await this.client.bucket(this.bucket).delete(path)
  }

  url(path: string): string {
    return `${this.baseUrl}/buckets/${this.bucket}/${path}`
  }
}
