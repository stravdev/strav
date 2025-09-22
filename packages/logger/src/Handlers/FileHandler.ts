import * as fs from 'fs';
import * as path from 'path';
import { AbstractHandler } from './AbstractHandler';
import type { LogRecord } from '../Types/LogRecord';
import { LogLevel } from '../Types/LogLevel';

/**
 * Handler for writing logs to files
 */
export class FileHandler extends AbstractHandler {
    /**
     * The path to the log file
     */
    protected filePath: string;

    /**
     * Create a new file handler instance
     */
    constructor(filePath: string) {
        super();
        this.filePath = filePath;
        
        // Ensure the directory exists
        const directory = path.dirname(filePath);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
    }

    /**
     * Process a log record
     */
    protected process(record: LogRecord): void {
        try {
            // Format the log entry
            const levelName = LogLevel[record.level];
            const timestamp = record.datetime.toISOString();
            const channel = record.channel;
            const message = record.message;
            
            let logEntry = `[${timestamp}] ${levelName} (${channel}): ${message}`;
            
            // Add context and extra data if available
            if (Object.keys(record.context).length > 0) {
                try {
                    logEntry += `\nContext: ${JSON.stringify(record.context, null, 2)}`;
                } catch {
                    logEntry += `\nContext: [Contains circular references or non-serializable data]`;
                }
            }
            
            if (Object.keys(record.extra).length > 0) {
                try {
                    logEntry += `\nExtra: ${JSON.stringify(record.extra, null, 2)}`;
                } catch {
                    logEntry += `\nExtra: [Contains circular references or non-serializable data]`;
                }
            }
            
            logEntry += '\n';
            
            // Append to file
            fs.appendFileSync(this.filePath, logEntry);
        } catch (error) {
            console.error(`Failed to write to log file: ${error}`);
        }
    }
}