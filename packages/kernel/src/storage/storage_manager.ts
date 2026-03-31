import { inject } from '../core/inject.ts'
import Configuration from '../config/configuration.ts'
import { ConfigurationError } from '../exceptions/errors.ts'
import LocalDriver from './local_driver.ts'
import S3Driver from './s3_driver.ts'
import OstraDriver from './ostra_driver.ts'
import type { StorageDriver, StorageConfig } from './types.ts'

/**
 * Central storage configuration hub.
 *
 * Resolved once via the DI container — reads the storage config
 * and initializes the appropriate driver.
 *
 * @example
 * app.singleton(StorageManager)
 * app.resolve(StorageManager)
 */
@inject
export default class StorageManager {
  private static _driver: StorageDriver
  private static _config: StorageConfig

  constructor(config: Configuration) {
    const driverName = config.get('storage.default', 'local') as string

    StorageManager._config = {
      default: driverName as 'local' | 's3',
      local: {
        root: 'storage',
        baseUrl: '/storage',
        ...(config.get('storage.local', {}) as object),
      },
      s3: {
        bucket: '',
        region: 'us-east-1',
        accessKeyId: '',
        secretAccessKey: '',
        ...(config.get('storage.s3', {}) as object),
      },
      ostra: {
        url: 'http://localhost:9000',
        token: '',
        bucket: '',
        ...(config.get('storage.ostra', {}) as object),
      },
    }

    if (driverName === 's3') {
      StorageManager._driver = new S3Driver(StorageManager._config.s3)
    } else if (driverName === 'ostra') {
      StorageManager._driver = new OstraDriver(StorageManager._config.ostra)
    } else {
      StorageManager._driver = new LocalDriver(StorageManager._config.local)
    }
  }

  static get driver(): StorageDriver {
    if (!StorageManager._driver) {
      throw new ConfigurationError(
        'StorageManager not configured. Resolve it through the container first.'
      )
    }
    return StorageManager._driver
  }

  static get config(): StorageConfig {
    return StorageManager._config
  }
}
