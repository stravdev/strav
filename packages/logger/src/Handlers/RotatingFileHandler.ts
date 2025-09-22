import { FileHandler } from './FileHandler'
import type { LogRecord } from '../Types/LogRecord'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Handler for writing logs to files with daily rotation
 */
export class RotatingFileHandler extends FileHandler {
  /**
   * The base path for the log file (without date)
   */
  protected baseFilePath: string

  /**
   * The current date for the log file
   */
  protected currentDate: string

  /**
   * Create a new rotating file handler instance
   */
  constructor(baseFilePath: string) {
    // Initialize with today's date
    const today = new Date()
    const dateStr = RotatingFileHandler.formatDate(today)
    const fullPath = RotatingFileHandler.getFullPath(baseFilePath, dateStr)

    super(fullPath)

    this.baseFilePath = baseFilePath
    this.currentDate = dateStr
  }

  /**
   * Format a date as YYYY-MM-DD
   */
  public static formatDate(date: Date): string {
    const isoDate = date.toISOString().split('T')[0]
    if (!isoDate) {
      throw new Error('Failed to format date')
    }
    return isoDate
  }

  /**
   * Get the full path with date
   */
  public static getFullPath(basePath: string, dateStr: string): string {
    const dir = path.dirname(basePath)
    const ext = path.extname(basePath)
    const filename = path.basename(basePath, ext)

    return path.join(dir, `${filename}-${dateStr}${ext}`)
  }

  /**
   * Process the log record by writing to the appropriate dated file
   */
  protected override process(record: LogRecord): void {
    // Check if we need to rotate to a new file
    const recordDate = RotatingFileHandler.formatDate(record.datetime)

    if (recordDate !== this.currentDate) {
      this.currentDate = recordDate
      this.filePath = RotatingFileHandler.getFullPath(this.baseFilePath, recordDate)

      // Ensure the directory exists
      const directory = path.dirname(this.filePath)
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true })
      }
    }

    // Use the parent class to write the log
    super.process(record)
  }
}
