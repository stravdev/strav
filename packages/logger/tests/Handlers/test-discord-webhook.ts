import { DiscordHandler } from '../../src/Handlers/DiscordHandler'
import { LogLevel } from '../../src/Types/LogLevel'
import type { LogRecord } from '../../src/Types/LogRecord'

// Your Discord webhook URL
const webhookUrl = 'replace-with-yours'

// Create Discord handler
const discordHandler = new DiscordHandler(webhookUrl)

// Set minimum level to Debug to see all messages
discordHandler.setMinLevel(LogLevel.Debug)

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

async function testDiscordWebhook() {
  console.log('🚀 Starting Discord webhook test...')

  // Test 1: Basic messages with different log levels
  console.log('📝 Sending basic log messages...')

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
    discordHandler.handle(record)
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second between messages
  }

  // Test 2: Message with context data
  console.log('📊 Sending message with context data...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const contextRecord = createLogRecord(LogLevel.Info, 'User login attempt', 'auth', {
    userId: 12345,
    username: 'john_doe',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    loginTime: new Date().toISOString(),
    sessionId: 'sess_abc123def456',
  })
  discordHandler.handle(contextRecord)

  // Test 3: Message with extra data
  console.log('🔧 Sending message with extra data...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

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
  discordHandler.handle(extraRecord)

  // Test 4: Message with both context and extra data
  console.log('📋 Sending message with both context and extra data...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

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
  discordHandler.handle(fullRecord)

  // Test 5: Message with long data (to test truncation)
  console.log('📏 Sending message with long data to test truncation...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const longDataRecord = createLogRecord(
    LogLevel.Critical,
    'System error with extensive debugging information',
    'system',
    {
      stackTrace: 'Error: Something went wrong\n'.repeat(50),
      requestData: JSON.stringify({ data: 'x'.repeat(500) }),
      systemState: 'critical',
      affectedServices: ['auth', 'payment', 'notification', 'analytics', 'reporting'],
    },
    {
      memoryUsage: '85%',
      cpuUsage: '92%',
      diskSpace: '95% full',
      activeConnections: 1500,
      queueSize: 10000,
      errorDetails:
        'This is a very long error message that should be truncated when it exceeds the Discord field limit of 1000 characters. '.repeat(
          10
        ),
    }
  )
  discordHandler.handle(longDataRecord)

  // Test 6: Edge case - empty message
  console.log('🔍 Sending edge case messages...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const emptyMessageRecord = createLogRecord(LogLevel.Info, '', 'test')
  discordHandler.handle(emptyMessageRecord)

  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Test 7: Message with special characters and emojis
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
  discordHandler.handle(specialCharsRecord)

  console.log('✅ Discord webhook test completed!')
  console.log('📱 Check your Discord channel to see the results!')
}

// Run the test
testDiscordWebhook().catch(console.error)
