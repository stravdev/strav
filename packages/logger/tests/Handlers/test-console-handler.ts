import { ConsoleHandler } from '../../src/Handlers/ConsoleHandler'
import { LogLevel } from '../../src/Types/LogLevel'
import type { LogRecord } from '../../src/Types/LogRecord'

// Create Console handler
const consoleHandler = new ConsoleHandler()

// Set minimum level to Debug to see all messages
consoleHandler.setMinLevel(LogLevel.Debug)

function createLogRecord(
  level: LogLevel,
  message: string,
  channel: string = 'test',
  context: Record<string, any> = {},
  extra: Record<string, any> = {}
): LogRecord {
  return {
    level,
    message,
    channel,
    context,
    extra,
    datetime: new Date(),
  }
}

async function testConsoleHandler() {
  console.log('🚀 Starting Console handler test...')
  console.log('📝 This will demonstrate different log levels and formatting\n')

  // Test 1: Basic messages with different log levels
  console.log('='.repeat(60))
  console.log('📝 Testing basic log messages with different levels:')
  console.log('='.repeat(60))

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
    const record = createLogRecord(msg.level, msg.message, msg.channel)
    consoleHandler.handle(record)
    await new Promise((resolve) => setTimeout(resolve, 500)) // Wait 500ms between messages
  }

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
  })
  consoleHandler.handle(contextRecord)

  // Test 3: Message with extra data
  console.log('\n' + '='.repeat(60))
  console.log('🔧 Testing message with extra data:')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

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
    }
  )
  consoleHandler.handle(extraRecord)

  // Test 4: Message with both context and extra data
  console.log('\n' + '='.repeat(60))
  console.log('📋 Testing message with both context and extra data:')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const fullRecord = createLogRecord(
    LogLevel.Error,
    'Transaction processing failed',
    'payment',
    {
      transactionId: 'txn_987654321',
      userId: 67890,
      amount: 99.99,
      currency: 'USD',
      paymentMethod: 'credit_card',
    },
    {
      errorCode: 'CARD_DECLINED',
      gatewayResponse: 'Insufficient funds',
      retryAttempt: 3,
      maxRetries: 5,
      processingTime: '2.3s',
      gatewayId: 'stripe_12345',
    }
  )
  consoleHandler.handle(fullRecord)

  // Test 5: Message with complex nested data
  console.log('\n' + '='.repeat(60))
  console.log('🏗️ Testing message with complex nested data:')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const complexRecord = createLogRecord(
    LogLevel.Critical,
    'System error with extensive debugging information',
    'system',
    {
      user: {
        id: 123,
        profile: {
          name: 'John Doe',
          email: 'john@example.com',
          settings: {
            theme: 'dark',
            notifications: true,
            language: 'en'
          }
        }
      },
      request: {
        method: 'POST',
        url: '/api/v1/transactions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ***'
        }
      }
    },
    {
      performance: {
        memoryUsage: '85%',
        cpuUsage: '92%',
        diskSpace: '95% full',
        activeConnections: 1500,
        queueSize: 10000
      },
      stackTrace: [
        'Error: Something went wrong',
        '    at processTransaction (/app/services/payment.js:45:12)',
        '    at handleRequest (/app/controllers/transaction.js:23:8)',
        '    at Router.handle (/app/routes/api.js:156:5)'
      ],
      affectedServices: ['auth', 'payment', 'notification', 'analytics', 'reporting']
    }
  )
  consoleHandler.handle(complexRecord)

  // Test 6: Edge cases
  console.log('\n' + '='.repeat(60))
  console.log('🔍 Testing edge cases:')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Empty message
  const emptyMessageRecord = createLogRecord(LogLevel.Info, '', 'test')
  consoleHandler.handle(emptyMessageRecord)

  await new Promise((resolve) => setTimeout(resolve, 500))

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
    }
  )
  consoleHandler.handle(specialCharsRecord)

  await new Promise((resolve) => setTimeout(resolve, 500))

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
    }
  )
  consoleHandler.handle(nullValuesRecord)

  await new Promise((resolve) => setTimeout(resolve, 500))

  // Test circular reference handling
  const circularContext: any = { name: 'test', id: 123 }
  circularContext.self = circularContext // Create circular reference
  
  const circularRecord = createLogRecord(
    LogLevel.Warning,
    'Testing circular reference handling',
    'test',
    circularContext
  )
  consoleHandler.handle(circularRecord)

  // Test 7: Level filtering demonstration
  console.log('\n' + '='.repeat(60))
  console.log('🎯 Testing level filtering (setting min level to Warning):')
  console.log('='.repeat(60))
  await new Promise((resolve) => setTimeout(resolve, 1000))

  consoleHandler.setMinLevel(LogLevel.Warning)
  
  console.log('These messages should be filtered out (below Warning level):')
  consoleHandler.handle(createLogRecord(LogLevel.Debug, 'This debug message should be filtered'))
  consoleHandler.handle(createLogRecord(LogLevel.Info, 'This info message should be filtered'))
  consoleHandler.handle(createLogRecord(LogLevel.Notice, 'This notice message should be filtered'))
  
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  console.log('\nThese messages should appear (Warning level and above):')
  consoleHandler.handle(createLogRecord(LogLevel.Warning, 'This warning message should appear'))
  consoleHandler.handle(createLogRecord(LogLevel.Error, 'This error message should appear'))
  consoleHandler.handle(createLogRecord(LogLevel.Critical, 'This critical message should appear'))

  // Reset to Debug level for final message
  consoleHandler.setMinLevel(LogLevel.Debug)

  console.log('\n' + '='.repeat(60))
  console.log('✅ Console handler test completed!')
  console.log('📱 All output above demonstrates the ConsoleHandler formatting!')
  console.log('='.repeat(60))
}

// Run the test
testConsoleHandler().catch(console.error)