import { join, extname, resolve } from 'node:path'
import { unlink } from 'node:fs/promises'
import { randomHex } from '../helpers/crypto.ts'
import type { StorageDriver, LocalDriverConfig } from './types.ts'

export default class LocalDriver implements StorageDriver {
  private root: string
  private baseUrl: string

  constructor(config: LocalDriverConfig) {
    this.root = resolve(config.root)
    this.baseUrl = config.baseUrl
  }

  async put(directory: string, file: File, name?: string): Promise<string> {
    const ext = extname(file.name)
    const filename = name ?? `${randomHex(8)}${ext}`
    const relativePath = join(directory, filename)
    const fullPath = join(this.root, relativePath)

    await Bun.write(fullPath, file)

    return relativePath
  }

  async get(path: string): Promise<Blob | null> {
    const file = Bun.file(join(this.root, path))
    if (!(await file.exists())) return null
    return file
  }

  async exists(path: string): Promise<boolean> {
    return Bun.file(join(this.root, path)).exists()
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.root, path)
    if (await Bun.file(fullPath).exists()) {
      await unlink(fullPath)
    }
  }

  url(path: string): string {
    return `${this.baseUrl}/${path}`
  }
}
