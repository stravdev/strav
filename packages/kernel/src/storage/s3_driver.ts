import { S3Client } from 'bun'
import { extname } from 'node:path'
import { randomHex } from '../helpers/crypto.ts'
import type { StorageDriver, S3DriverConfig } from './types.ts'

export default class S3Driver implements StorageDriver {
  private client: S3Client
  private cdnUrl?: string

  constructor(config: S3DriverConfig) {
    this.cdnUrl = config.baseUrl ?? undefined

    this.client = new S3Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      endpoint: config.endpoint ?? undefined,
      bucket: config.bucket,
    })
  }

  async put(directory: string, file: File, name?: string): Promise<string> {
    const ext = extname(file.name)
    const filename = name ?? `${randomHex(8)}${ext}`
    const key = `${directory}/${filename}`

    const s3File = this.client.file(key)
    await s3File.write(file)

    return key
  }

  async get(path: string): Promise<Blob | null> {
    const s3File = this.client.file(path)
    if (!(await s3File.exists())) return null
    return new Blob([await s3File.arrayBuffer()])
  }

  async exists(path: string): Promise<boolean> {
    return this.client.file(path).exists()
  }

  async delete(path: string): Promise<void> {
    await this.client.file(path).delete()
  }

  url(path: string, expiresIn = 3600): string {
    if (this.cdnUrl) return `${this.cdnUrl}/${path}`
    return this.client.file(path).presign({ expiresIn })
  }
}
