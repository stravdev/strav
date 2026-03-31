import StorageManager from './storage_manager.ts'

/**
 * Static file storage API.
 *
 * Delegates all operations to the configured driver (local or S3).
 *
 * @example
 * const path = await Storage.put('avatars', avatarFile)
 * const url = Storage.url(path)
 * await Storage.delete(path)
 */
export default class Storage {
  /** Store a file with a random filename. */
  static put(directory: string, file: File): Promise<string> {
    return StorageManager.driver.put(directory, file)
  }

  /** Store a file with a custom filename. */
  static putAs(directory: string, file: File, name: string): Promise<string> {
    return StorageManager.driver.put(directory, file, name)
  }

  /** Retrieve file content, or null if not found. */
  static get(path: string): Promise<Blob | null> {
    return StorageManager.driver.get(path)
  }

  /** Check if a file exists. */
  static exists(path: string): Promise<boolean> {
    return StorageManager.driver.exists(path)
  }

  /** Delete a file. */
  static delete(path: string): Promise<void> {
    return StorageManager.driver.delete(path)
  }

  /** Generate a URL for the file. */
  static url(path: string, expiresIn?: number): string {
    return StorageManager.driver.url(path, expiresIn)
  }
}
