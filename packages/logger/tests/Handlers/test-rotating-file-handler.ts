import { RotatingFileHandler } from '../../src/Handlers/RotatingFileHandler'
import { LogLevel } from '../../src/Types/LogLevel'
import type { LogRecord } from '../../src/Types/LogRecord'
import * as fs from 'fs'
import * as path from 'path'

// Create test directory for log files
const testLogDir = path.join(process.cwd(), 'test-logs')
const baseLogPath = path.join(testLogDir, 'app.log')

// Create RotatingFileHandler
const rotatingFileHandler = new RotatingFileHandler(baseLogPath)

// Set minimum level to Debug to see all messages
rotatingFileHandler.setMinLevel(LogLevel.Debug)

function createLogRecord(
  level: LogLevel,
  message: string,
  channel: string = 'test',
  context: Record<string, any> = {},
  extra: Record<string, any> = {},
  datetime: Date = new Date()
): LogRecord {
  return {
    level,
    message,
    channel,
    context,
    extra,
    datetime,
  }
}

function cleanupTestFiles() {
  try {
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir)
      for (const file of files) {
        fs.unlinkSync(path.join(testLogDir, file))
      }
      fs.rmdirSync(testLogDir)
    }
  } catch (error) {
    console.error('Error cleaning up test files:', error)
  }
}

function displayLogFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      console.log(`📄 Contents of ${path.basename(filePath)}:`)
      console.log('─'.repeat(80))
      console.log(content)
      console.log('─'.repeat(80))
    } else {
      console.log(`❌ File ${path.basename(filePath)} does not exist`)
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error)
  }
}

function listLogFiles() {
  try {
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir)
      const logFiles = files.filter(file => file.endsWith('.log')).sort()
      
      console.log(`📁 Log files created in ${testLogDir}:`)
      if (logFiles.length === 0) {
        console.log('   No log files found')
      } else {
        logFiles.forEach(file => {
          const filePath = path.join(testLogDir, file)
          const stats = fs.statSync(filePath)
          console.log(`   📄 ${file} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`)
        })
      }
      console.log()
    }
  } catch (error) {
    console.error('Error listing log files:', error)
  }
}

async function testRotatingFileHandler() {
  console.log('🚀 Starting RotatingFileHandler test...')
  console.log('📝 This will demonstrate file rotation, different log levels, and file output\n')

  // Clean up any existing test files
  cleanupTestFiles()

  // Test 1: Basic messages with different log levels (same day)
  console.log('='.repeat(60))
  console.log('📝 Testing basic log messages with different levels (same day):')
  console.log('='.repeat(60))

  const today = new Date('2024-01-15T10:00:00.000Z')
  
  const basicMessages = [
    { level: LogLevel.Debug, message: 'Debug message - application started', channel: 'app' },
    { level: LogLevel.Info, message: 'User authentication successful', channel: 'auth' },
    { level: LogLevel.Notice, message: 'New user registered', channel: 'user' },
    { level: LogLevel.Warning, message: 'High memory usage detected', channel: 'system' },
    { level: LogLevel.Error, message: 'Database connection failed', channel: 'database' },
    { level: LogLevel.Critical, message: 'Payment processing error', channel: 'payment' },
    { level: LogLevel.Alert, message: 'Security breach attempt detected', channel: 'security' },
    { level: LogLevel.Emergency, message: 'System shutdown initiated', channel: 'system' },
  ]

  for (const msg of basicMessages) {
    const record = createLogRecord(msg.level, msg.message, msg.channel, {}, {}, today)
    rotatingFileHandler.handle(record)
    console.log(`✅ Logged ${LogLevel[msg.level]} message to file`)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  listLogFiles()
  displayLogFile(path.join(testLogDir, 'app-2024-01-15.log'))

  // Test 2: Message with context data
  console.log('\n' + '='.repeat(60))
  console.log('📊 Testing message with context data:')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const contextRecord = createLogRecord(LogLevel.Info, 'User login attempt', 'auth', {
    userId: 12345,
    username: 'john_doe',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    loginTime: new Date().toISOString(),
    sessionId: 'sess_abc123def456',
  }, {}, today)
  
  rotatingFileHandler.handle(contextRecord)
  console.log('✅ Logged message with context data')

  // Test 3: Message with extra data
  console.log('\n' + '='.repeat(60))
  console.log('🔧 Testing message with extra data:')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 500))

  const extraRecord = createLogRecord(
    LogLevel.Warning,
    'API rate limit approaching',
    'api',
    {},
    {
      currentRequests: 950,
      maxRequests: 1000,
      timeWindow: '1 hour',
      endpoint: '/api/v1/users',
      clientId: 'client_xyz789',
      remainingTime: '15 minutes',
    },
    today
  )
  rotatingFileHandler.handle(extraRecord)
  console.log('✅ Logged message with extra data')

  // Test 4: Daily rotation demonstration
  console.log('\n' + '='.repeat(60))
  console.log('🔄 Testing daily rotation (simulating different days):')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const rotationDates = [
    { date: new Date('2024-01-16T09:00:00.000Z'), day: 'Day 2' },
    { date: new Date('2024-01-17T14:30:00.000Z'), day: 'Day 3' },
    { date: new Date('2024-01-18T18:45:00.000Z'), day: 'Day 4' },
    { date: new Date('2024-01-20T12:15:00.000Z'), day: 'Day 6 (skipped Day 5)' },
  ]

  for (const { date, day } of rotationDates) {
    const record = createLogRecord(
      LogLevel.Info,
      `${day} - System operational`,
      'system',
      { 
        systemStatus: 'healthy',
        uptime: '24h',
        activeUsers: Math.floor(Math.random() * 1000) + 100
      },
      {
        memoryUsage: `${Math.floor(Math.random() * 30) + 40}%`,
        cpuUsage: `${Math.floor(Math.random() * 20) + 10}%`,
        diskSpace: `${Math.floor(Math.random() * 40) + 20}% used`
      },
      date
    )
    
    rotatingFileHandler.handle(record)
    console.log(`✅ Logged message for ${day} (${date.toISOString().split('T')[0]})`)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  listLogFiles()

  // Test 5: Complex nested data with rotation
  console.log('\n' + '='.repeat(60))
  console.log('🏗️ Testing complex nested data across multiple days:')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const complexDates = [
    new Date('2024-01-21T10:00:00.000Z'),
    new Date('2024-01-22T15:30:00.000Z'),
  ]

  for (let i = 0; i < complexDates.length; i++) {
    const date = complexDates[i]
    const complexRecord = createLogRecord(
      LogLevel.Critical,
      `Day ${i + 1} - System error with extensive debugging information`,
      'system',
      {
        user: {
          id: 123 + i,
          profile: {
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            settings: {
              theme: i % 2 === 0 ? 'dark' : 'light',
              notifications: true,
              language: 'en'
            }
          }
        },
        request: {
          method: 'POST',
          url: `/api/v1/transactions/${i + 1}`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ***'
          }
        }
      },
      {
        performance: {
          memoryUsage: `${85 + i}%`,
          cpuUsage: `${92 + i}%`,
          diskSpace: `${95 + i}% full`,
          activeConnections: 1500 + (i * 100),
          queueSize: 10000 + (i * 1000)
        },
        stackTrace: [
          `Error: Something went wrong on day ${i + 1}`,
          `    at processTransaction (/app/services/payment.js:${45 + i}:12)`,
          `    at handleRequest (/app/controllers/transaction.js:${23 + i}:8)`,
          `    at Router.handle (/app/routes/api.js:${156 + i}:5)`
        ],
        affectedServices: ['auth', 'payment', 'notification', 'analytics', 'reporting']
      },
      date
    )
    
    rotatingFileHandler.handle(complexRecord)
    console.log(`✅ Logged complex data for ${date.toISOString().split('T')[0]}`)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  // Test 6: Edge cases
  console.log('\n' + '='.repeat(60))
  console.log('🔍 Testing edge cases:')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const edgeDate = new Date('2024-01-23T12:00:00.000Z')

  // Empty message
  const emptyMessageRecord = createLogRecord(LogLevel.Info, '', 'test', {}, {}, edgeDate)
  rotatingFileHandler.handle(emptyMessageRecord)
  console.log('✅ Logged empty message')

  await new Promise((resolve) => setTimeout(resolve, 300))

  // Message with special characters and emojis
  const specialCharsRecord = createLogRecord(
    LogLevel.Notice,
    '🎉 Special event: User "John O\'Connor" completed task #42 with 100% success! 🚀',
    'events',
    {
      emoji: '🎉🚀💯',
      specialChars: 'àáâãäåæçèéêë',
      unicode: '你好世界',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    },
    {},
    edgeDate
  )
  rotatingFileHandler.handle(specialCharsRecord)
  console.log('✅ Logged message with special characters and emojis')

  await new Promise((resolve) => setTimeout(resolve, 300))

  // Message with null and undefined values
  const nullValuesRecord = createLogRecord(
    LogLevel.Debug,
    'Testing null and undefined values',
    'test',
    {
      nullValue: null,
      undefinedValue: undefined,
      emptyString: '',
      zeroNumber: 0,
      falseBoolean: false
    },
    {},
    edgeDate
  )
  rotatingFileHandler.handle(nullValuesRecord)
  console.log('✅ Logged message with null and undefined values')

  await new Promise((resolve) => setTimeout(resolve, 300))

  // Test circular reference handling
  const circularContext: any = { name: 'test', id: 123 }
  circularContext.self = circularContext // Create circular reference
  
  const circularRecord = createLogRecord(
    LogLevel.Warning,
    'Testing circular reference handling',
    'test',
    circularContext,
    {},
    edgeDate
  )
  rotatingFileHandler.handle(circularRecord)
  console.log('✅ Logged message with circular reference')

  // Test 7: Level filtering demonstration
  console.log('\n' + '='.repeat(60))
  console.log('🎯 Testing level filtering (setting min level to Warning):')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const filterDate = new Date('2024-01-24T16:00:00.000Z')
  rotatingFileHandler.setMinLevel(LogLevel.Warning)
  
  console.log('These messages should be filtered out (below Warning level):')
  rotatingFileHandler.handle(createLogRecord(LogLevel.Debug, 'This debug message should be filtered', 'test', {}, {}, filterDate))
  rotatingFileHandler.handle(createLogRecord(LogLevel.Info, 'This info message should be filtered', 'test', {}, {}, filterDate))
  rotatingFileHandler.handle(createLogRecord(LogLevel.Notice, 'This notice message should be filtered', 'test', {}, {}, filterDate))
  console.log('✅ Attempted to log filtered messages (should not appear in file)')
  
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  console.log('\nThese messages should appear (Warning level and above):')
  rotatingFileHandler.handle(createLogRecord(LogLevel.Warning, 'This warning message should appear', 'test', {}, {}, filterDate))
  rotatingFileHandler.handle(createLogRecord(LogLevel.Error, 'This error message should appear', 'test', {}, {}, filterDate))
  rotatingFileHandler.handle(createLogRecord(LogLevel.Critical, 'This critical message should appear', 'test', {}, {}, filterDate))
  console.log('✅ Logged messages above Warning level')

  // Reset to Debug level for final summary
  rotatingFileHandler.setMinLevel(LogLevel.Debug)

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 FINAL SUMMARY - All created log files:')
  console.log('='.repeat(60))
  
  listLogFiles()

  // Display contents of a few key files
  const keyFiles = [
    'app-2024-01-15.log',
    'app-2024-01-16.log',
    'app-2024-01-21.log',
    'app-2024-01-23.log',
    'app-2024-01-24.log'
  ]

  for (const fileName of keyFiles) {
    const filePath = path.join(testLogDir, fileName)
    if (fs.existsSync(filePath)) {
      console.log(`\n📄 Sample content from ${fileName}:`)
      displayLogFile(filePath)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ RotatingFileHandler test completed!')
  console.log(`📁 Check the log files in: ${testLogDir}`)
  console.log('🔄 Notice how logs are automatically rotated to different files by date!')
  console.log('='.repeat(60))

  // Final message about cleanup
  console.log('\n💡 To clean up test files, you can delete the test-logs directory')
  console.log(`   rm -rf "${testLogDir}"`)
}

// Run the test
testRotatingFileHandler().catch(console.error)