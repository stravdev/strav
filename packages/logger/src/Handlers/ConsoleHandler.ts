import { AbstractHandler } from './AbstractHandler';
import type { LogRecord } from '../Types/LogRecord';
import { LogLevel } from '../Types/LogLevel';

/**
 * Handler for outputting logs to the console
 */
export class ConsoleHandler extends AbstractHandler {
    /**
     * Process a log record
     */
    public process(record: LogRecord): void {
        if (!this.shouldHandle(record)) {
            return;
        }

        const levelColors: Record<LogLevel, string> = {
            [LogLevel.Debug]: '\x1b[34m', // Blue
            [LogLevel.Info]: '\x1b[32m', // Green
            [LogLevel.Notice]: '\x1b[36m', // Cyan
            [LogLevel.Warning]: '\x1b[33m', // Yellow
            [LogLevel.Error]: '\x1b[31m', // Red
            [LogLevel.Critical]: '\x1b[35m', // Magenta
            [LogLevel.Alert]: '\x1b[41m\x1b[37m', // White on Red background
            [LogLevel.Emergency]: '\x1b[41m\x1b[37m', // White on Red background
        };

        const reset = '\x1b[0m';
        const levelName = LogLevel[record.level];
        const color = levelColors[record.level] || '';
        const timestamp = record.datetime.toISOString();
        
        // Format the log message
        let output = `${timestamp} ${color}[${levelName}]${reset} ${record.message}`;
        
        // Add context if available
        if (Object.keys(record.context).length > 0) {
            try {
                output += `\nContext: ${JSON.stringify(record.context, null, 2)}`;
            } catch (error) {
                output += `\nContext: [Circular reference or non-serializable data]`;
            }
        }
        
        // Add extra data if available
        if (Object.keys(record.extra).length > 0) {
            try {
                output += `\nExtra: ${JSON.stringify(record.extra, null, 2)}`;
            } catch (error) {
                output += `\nExtra: [Circular reference or non-serializable data]`;
            }
        }
        
        // Output to console based on level
        if (record.level >= LogLevel.Error) {
            console.error(output);
        } else if (record.level >= LogLevel.Warning) {
            console.warn(output);
        } else {
            console.log(output);
        }
    }
}