import { StravError } from '../exceptions/strav_error.ts'

type RequestBody = string | Blob | ArrayBuffer | Uint8Array | ReadableStream | FormData | null

// ─── Error ───────────────────────────────────────────────────────────

export class OstraError extends StravError {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message)
  }
}

// ─── Types ───────────────────────────────────────────────────────────

export interface BucketInfo {
  name: string
  visibility: 'private' | 'public-read' | 'public-read-list'
  versioning: 'enabled' | 'disabled'
  created_at: string
}

export interface BucketStats extends BucketInfo {
  object_count: number
  total_size: number
  version_count: number
  total_version_size: number
}

export interface ObjectMeta {
  key: string
  size: number
  content_type: string
  etag: string
  created_at: string
  version_id?: string
}

export interface ObjectHeaders {
  contentType: string
  contentLength: number
  etag: string
  lastModified: string
  versionId?: string
}

export interface ListResult {
  objects: ObjectMeta[]
  cursor: string | null
  has_more: boolean
}

export interface VersionInfo {
  version_id: string
  size: number
  content_type: string
  etag: string
  created_at: string
}

export interface VersionListResult {
  key: string
  versions: VersionInfo[]
  cursor: string | null
  has_more: boolean
}

export interface BatchDeleteResult {
  deleted: string[]
  errors: Array<{ key: string; code: string; message: string }>
}

export interface SignedUrlResult {
  url: string
  expires_at: string
}

export interface MultipartInfo {
  upload_id: string
  key: string
  content_type: string
}

export interface PartInfo {
  part_number: number
  etag: string
  size: number
}

export interface TokenInfo {
  token: string
  scope: 'root' | 'read-write' | 'read-only'
  buckets: string[] | '*'
  label?: string
  created_at: string
}

export interface TokenRecord {
  id: string
  scope: 'root' | 'read-write' | 'read-only'
  buckets: string[] | '*'
  label?: string
  created_at: string
  last_used_at: string | null
}

// ─── OstraMultipart ──────────────────────────────────────────────────

export class OstraMultipart {
  private parts: Array<{ part_number: number; etag: string }> = []

  constructor(
    private client: OstraClient,
    readonly bucket: string,
    readonly key: string,
    readonly uploadId: string
  ) {}

  async part(partNumber: number, body: Blob | ArrayBuffer | Uint8Array): Promise<PartInfo> {
    const result = await this.client.request<PartInfo>(
      'PUT',
      `/buckets/${this.bucket}/${this.key}?partNumber=${partNumber}&uploadId=${this.uploadId}`,
      body as RequestBody
    )
    this.parts.push({ part_number: result.part_number, etag: result.etag })
    return result
  }

  async complete(): Promise<ObjectMeta> {
    const sorted = [...this.parts].sort((a, b) => a.part_number - b.part_number)
    return this.client.request<ObjectMeta>(
      'POST',
      `/buckets/${this.bucket}/${this.key}?uploadId=${this.uploadId}`,
      JSON.stringify({ parts: sorted }),
      { 'Content-Type': 'application/json' }
    )
  }

  async abort(): Promise<void> {
    await this.client.request(
      'DELETE',
      `/buckets/${this.bucket}/${this.key}?uploadId=${this.uploadId}`
    )
  }
}

// ─── OstraBucket ─────────────────────────────────────────────────────

export class OstraBucket {
  constructor(
    private client: OstraClient,
    readonly name: string
  ) {}

  // ── Bucket management ──

  async info(): Promise<BucketStats> {
    return this.client.request<BucketStats>('GET', `/buckets/${this.name}`)
  }

  async update(options: {
    visibility?: 'private' | 'public-read' | 'public-read-list'
    versioning?: 'enabled' | 'disabled'
  }): Promise<BucketInfo> {
    return this.client.request<BucketInfo>(
      'PATCH',
      `/buckets/${this.name}`,
      JSON.stringify(options),
      { 'Content-Type': 'application/json' }
    )
  }

  async destroy(): Promise<void> {
    await this.client.request('DELETE', `/buckets/${this.name}`)
  }

  // ── Objects ──

  async put(
    key: string,
    body: Blob | File | ArrayBuffer | Uint8Array | ReadableStream,
    contentType?: string
  ): Promise<ObjectMeta> {
    const type =
      contentType ??
      (body instanceof File ? body.type : undefined) ??
      (body instanceof Blob ? body.type : undefined) ??
      'application/octet-stream'

    const size =
      body instanceof Blob || body instanceof File
        ? body.size
        : body instanceof ArrayBuffer || body instanceof Uint8Array
          ? body.byteLength
          : undefined

    const headers: Record<string, string> = { 'Content-Type': type }
    if (size !== undefined) headers['Content-Length'] = String(size)

    return this.client.request<ObjectMeta>(
      'PUT',
      `/buckets/${this.name}/${key}`,
      body as RequestBody,
      headers
    )
  }

  async get(key: string, options?: { versionId?: string; range?: string }): Promise<Blob> {
    const params = new URLSearchParams()
    if (options?.versionId) params.set('versionId', options.versionId)
    const qs = params.toString()

    const headers: Record<string, string> = {}
    if (options?.range) headers['Range'] = options.range

    const response = await this.client.raw(
      'GET',
      `/buckets/${this.name}/${key}${qs ? `?${qs}` : ''}`,
      undefined,
      headers
    )
    return response.blob()
  }

  async head(key: string, options?: { versionId?: string }): Promise<ObjectHeaders> {
    const params = new URLSearchParams()
    if (options?.versionId) params.set('versionId', options.versionId)
    const qs = params.toString()

    const response = await this.client.raw(
      'HEAD',
      `/buckets/${this.name}/${key}${qs ? `?${qs}` : ''}`
    )
    return {
      contentType: response.headers.get('Content-Type') ?? 'application/octet-stream',
      contentLength: Number(response.headers.get('Content-Length') ?? 0),
      etag: response.headers.get('ETag') ?? '',
      lastModified: response.headers.get('Last-Modified') ?? '',
      versionId: response.headers.get('X-Ostra-Version-Id') ?? undefined,
    }
  }

  async delete(
    key: string,
    options?: { versionId?: string; allVersions?: boolean }
  ): Promise<void> {
    const params = new URLSearchParams()
    if (options?.versionId) params.set('versionId', options.versionId)
    else if (options?.allVersions) params.set('allVersions', '')
    const qs = params.toString()

    await this.client.request('DELETE', `/buckets/${this.name}/${key}${qs ? `?${qs}` : ''}`)
  }

  async list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<ListResult> {
    const params = new URLSearchParams({ list: '' })
    if (options?.prefix) params.set('prefix', options.prefix)
    if (options?.cursor) params.set('cursor', options.cursor)
    if (options?.limit) params.set('limit', String(options.limit))

    return this.client.request<ListResult>('GET', `/buckets/${this.name}?${params}`)
  }

  async versions(
    key: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<VersionListResult> {
    const params = new URLSearchParams({ versions: '' })
    if (options?.cursor) params.set('cursor', options.cursor)
    if (options?.limit) params.set('limit', String(options.limit))

    return this.client.request<VersionListResult>('GET', `/buckets/${this.name}/${key}?${params}`)
  }

  async deleteMany(keys: string[]): Promise<BatchDeleteResult> {
    return this.client.request<BatchDeleteResult>(
      'POST',
      `/buckets/${this.name}?delete`,
      JSON.stringify({ keys }),
      { 'Content-Type': 'application/json' }
    )
  }

  async copy(
    key: string,
    source: { bucket: string; key: string; versionId?: string }
  ): Promise<ObjectMeta> {
    const body: Record<string, string> = {
      source_bucket: source.bucket,
      source_key: source.key,
    }
    if (source.versionId) body.source_version_id = source.versionId

    return this.client.request<ObjectMeta>(
      'POST',
      `/buckets/${this.name}/${key}?copy`,
      JSON.stringify(body),
      { 'Content-Type': 'application/json' }
    )
  }

  async signedUrl(key: string, method: 'GET' | 'PUT', expiresIn = 3600): Promise<SignedUrlResult> {
    return this.client.request<SignedUrlResult>(
      'POST',
      `/buckets/${this.name}/${key}?sign`,
      JSON.stringify({ method, expires_in: expiresIn }),
      { 'Content-Type': 'application/json' }
    )
  }

  async multipart(key: string, contentType: string): Promise<OstraMultipart> {
    const info = await this.client.request<MultipartInfo>(
      'POST',
      `/buckets/${this.name}/${key}?uploads`,
      JSON.stringify({ content_type: contentType }),
      { 'Content-Type': 'application/json' }
    )
    return new OstraMultipart(this.client, this.name, key, info.upload_id)
  }
}

// ─── OstraClient ─────────────────────────────────────────────────────

export interface OstraClientConfig {
  url: string
  token: string
}

export default class OstraClient {
  private baseUrl: string
  private token: string

  constructor(config: OstraClientConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.token = config.token
  }

  // ── Buckets ──

  bucket(name: string): OstraBucket {
    return new OstraBucket(this, name)
  }

  async createBucket(
    name: string,
    options?: {
      visibility?: 'private' | 'public-read' | 'public-read-list'
      versioning?: 'enabled' | 'disabled'
    }
  ): Promise<BucketInfo> {
    return this.request<BucketInfo>('POST', '/buckets', JSON.stringify({ name, ...options }), {
      'Content-Type': 'application/json',
    })
  }

  async listBuckets(): Promise<BucketInfo[]> {
    const result = await this.request<{ buckets: BucketInfo[] }>('GET', '/buckets')
    return result.buckets
  }

  // ── Tokens ──

  async createToken(options: {
    scope: 'root' | 'read-write' | 'read-only'
    buckets?: string[]
    label?: string
  }): Promise<TokenInfo> {
    return this.request<TokenInfo>('POST', '/tokens', JSON.stringify(options), {
      'Content-Type': 'application/json',
    })
  }

  async listTokens(): Promise<TokenRecord[]> {
    const result = await this.request<{ tokens: TokenRecord[] }>('GET', '/tokens')
    return result.tokens
  }

  async deleteToken(id: string): Promise<void> {
    await this.request('DELETE', `/tokens/${id}`)
  }

  // ── HTTP layer ──

  /** @internal Make a request and parse the JSON response. */
  async request<T = void>(
    method: string,
    path: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.raw(method, path, body, headers)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  /** @internal Make a request and return the raw Response. */
  async raw(
    method: string,
    path: string,
    body?: RequestBody,
    headers?: Record<string, string>
  ): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...headers,
      },
      body: body ?? null,
    })

    if (!response.ok) {
      let code = 'UNKNOWN'
      let message = `Ostra responded with ${response.status}`
      try {
        const text = await response.text()
        if (text) {
          const json = JSON.parse(text) as { error?: { code?: string; message?: string } }
          if (json.error?.code) code = json.error.code
          if (json.error?.message) message = json.error.message
        }
      } catch {}
      if (code === 'UNKNOWN' && response.status === 404) code = 'NOT_FOUND'
      throw new OstraError(code, message, response.status)
    }

    return response
  }
}
