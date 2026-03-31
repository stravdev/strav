import Storage from './storage.ts'
import { StravError } from '../exceptions/strav_error.ts'

export class FileTooLargeError extends StravError {}

export class InvalidFileTypeError extends StravError {}

export interface UploadResult {
  path: string
  url: string
}

const SIZE_UNITS: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
}

/**
 * Fluent file upload builder with validation.
 *
 * @example
 * const { path, url } = await Upload.file(avatar)
 *   .maxSize('5mb')
 *   .types(['image/jpeg', 'image/png'])
 *   .store('avatars')
 */
export class Upload {
  private _maxSizeBytes?: number
  private _allowedTypes?: string[]

  private constructor(private _file: File) {}

  /** Start an upload pipeline. */
  static file(file: File): Upload {
    return new Upload(file)
  }

  /** Set maximum file size (e.g. '5mb', '500kb', '1gb', or bytes as number). */
  maxSize(size: string | number): this {
    this._maxSizeBytes = typeof size === 'number' ? size : parseSize(size)
    return this
  }

  /** Set allowed MIME types. */
  types(types: string[]): this {
    this._allowedTypes = types
    return this
  }

  /** Validate and store the file. */
  async store(directory: string, name?: string): Promise<UploadResult> {
    this.validate()

    const path = name
      ? await Storage.putAs(directory, this._file, name)
      : await Storage.put(directory, this._file)

    const url = Storage.url(path)

    return { path, url }
  }

  private validate(): void {
    if (this._maxSizeBytes !== undefined && this._file.size > this._maxSizeBytes) {
      throw new FileTooLargeError(
        `File size ${formatBytes(this._file.size)} exceeds maximum ${formatBytes(this._maxSizeBytes)}`
      )
    }

    if (this._allowedTypes && !this._allowedTypes.includes(this._file.type)) {
      throw new InvalidFileTypeError(
        `File type "${this._file.type}" not allowed. Allowed: ${this._allowedTypes.join(', ')}`
      )
    }
  }
}

function parseSize(size: string): number {
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/)
  if (!match) throw new Error(`Invalid size format: "${size}". Use e.g. '5mb', '500kb', '1gb'`)
  return parseFloat(match[1]!) * SIZE_UNITS[match[2]!]!
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
}
