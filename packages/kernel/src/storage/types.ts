export interface StorageDriver {
  /** Store a file and return its relative path/key. */
  put(directory: string, file: File, name?: string): Promise<string>

  /** Retrieve file content, or null if not found. */
  get(path: string): Promise<Blob | null>

  /** Check if a file exists. */
  exists(path: string): Promise<boolean>

  /** Delete a file. */
  delete(path: string): Promise<void>

  /** Generate a URL for the file. */
  url(path: string, expiresIn?: number): string
}

export interface FileStats {
  size: number
  lastModified: Date
  contentType?: string
}

export interface LocalDriverConfig {
  root: string
  baseUrl: string
}

export interface S3DriverConfig {
  bucket: string
  region: string
  endpoint?: string | null
  accessKeyId: string
  secretAccessKey: string
  baseUrl?: string | null
}

export interface OstraDriverConfig {
  url: string
  token: string
  bucket: string
}

export interface StorageConfig {
  default: 'local' | 's3' | 'ostra'
  local: LocalDriverConfig
  s3: S3DriverConfig
  ostra: OstraDriverConfig
}
