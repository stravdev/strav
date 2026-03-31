export interface EncryptionConfig {
  /** The application key used for symmetric encryption and HMAC signing. Required. */
  key: string
  /** Previous keys for rotation — tried on decrypt/unseal failure before giving up. */
  previousKeys: string[]
}
