/**
 * Represents a configuration change event.
 */
export interface ConfigChange {
  /** Dot-notation path to the changed key */
  path: string
  /** Value before the change */
  oldValue: any
  /** Value after the change */
  newValue: any
  /** When the change occurred */
  timestamp: Date
}
