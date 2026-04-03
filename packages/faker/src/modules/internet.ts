import type { SeededRandom } from '../seed.ts'
import type { PersonModule } from './person.ts'
import type { EmailOptions, PasswordOptions } from '../types.ts'
import { emailProviders, domainSuffixes, protocols, userAgents } from '../data/domains.ts'

export class InternetModule {
  constructor(
    private random: SeededRandom,
    private person: PersonModule
  ) {}

  email(options: EmailOptions = {}): string {
    const firstName = options.firstName ?? this.person.firstName().toLowerCase()
    const lastName = options.lastName ?? this.person.lastName().toLowerCase()
    const provider = options.provider ?? this.random.arrayElement(emailProviders)

    const formats = [
      () => `${firstName}@${provider}`,
      () => `${lastName}@${provider}`,
      () => `${firstName}.${lastName}@${provider}`,
      () => `${firstName}_${lastName}@${provider}`,
      () => `${firstName}${this.random.int(10, 999)}@${provider}`,
      () => `${firstName[0]}${lastName}@${provider}`,
      () => `${firstName}${lastName[0]}@${provider}`,
    ]

    return this.random.arrayElement(formats)()
  }

  username(): string {
    return this.person.username()
  }

  password(options: PasswordOptions = {}): string {
    const length = options.length ?? 12
    const memorable = options.memorable ?? false

    if (memorable) {
      const words = ['sunny', 'happy', 'green', 'blue', 'fast', 'smart', 'cool', 'super']
      const word = this.random.arrayElement(words)
      const number = this.random.int(100, 999)
      const symbols = ['!', '@', '#', '$', '%', '&', '*']
      const symbol = this.random.arrayElement(symbols)
      return `${word}${number}${symbol}`
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''

    for (let i = 0; i < length; i++) {
      password += chars[this.random.int(0, chars.length - 1)]
    }

    return password
  }

  url(): string {
    const protocol = this.random.arrayElement(protocols)
    const domain = this.domainName()
    const paths = ['', '/about', '/products', '/services', '/contact', '/blog', '/news']
    const path = this.random.arrayElement(paths)

    return `${protocol}://${domain}${path}`
  }

  domainName(): string {
    const words = ['tech', 'web', 'app', 'cloud', 'data', 'digital', 'smart', 'next', 'future', 'prime']
    const word = this.random.arrayElement(words)
    const suffix = this.random.arrayElement(domainSuffixes)

    return `${word}${suffix}`
  }

  domainWord(): string {
    const words = ['tech', 'web', 'app', 'cloud', 'data', 'digital', 'smart', 'next', 'future', 'prime', 'mega', 'ultra', 'super', 'hyper']
    return this.random.arrayElement(words)
  }

  ipAddress(): string {
    const octets = []
    for (let i = 0; i < 4; i++) {
      octets.push(this.random.int(0, 255))
    }
    return octets.join('.')
  }

  ipv6Address(): string {
    const segments = []
    for (let i = 0; i < 8; i++) {
      const segment = this.random.int(0, 65535).toString(16)
      segments.push(segment)
    }
    return segments.join(':')
  }

  mac(): string {
    const segments = []
    for (let i = 0; i < 6; i++) {
      const segment = this.random.int(0, 255).toString(16).padStart(2, '0')
      segments.push(segment)
    }
    return segments.join(':')
  }

  userAgent(): string {
    return this.random.arrayElement(userAgents)
  }

  port(): number {
    return this.random.int(1, 65535)
  }

  protocol(): string {
    return this.random.arrayElement(['http', 'https', 'ftp', 'ssh', 'telnet', 'smtp', 'pop3', 'imap'])
  }

  httpMethod(): string {
    return this.random.arrayElement(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
  }

  httpStatusCode(): number {
    const codes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 405, 409, 422, 500, 502, 503, 504]
    return this.random.arrayElement(codes)
  }

  emoji(): string {
    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶']
    return this.random.arrayElement(emojis)
  }
}