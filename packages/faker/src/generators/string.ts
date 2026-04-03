import type { SeededRandom } from '../seed.ts'
import type { StringGeneratorOptions } from '../types.ts'

export class StringGenerator {
  constructor(private random: SeededRandom) {}

  uuid(): string {
    const hex = '0123456789abcdef'
    let uuid = ''

    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-'
      } else if (i === 14) {
        uuid += '4'
      } else if (i === 19) {
        uuid += hex[this.random.int(8, 11)]
      } else {
        uuid += hex[this.random.int(0, 15)]
      }
    }

    return uuid
  }

  nanoid(length = 21): string {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'
    let id = ''

    for (let i = 0; i < length; i++) {
      id += alphabet[this.random.int(0, alphabet.length - 1)]
    }

    return id
  }

  alpha(options: StringGeneratorOptions = {}): string {
    const length = options.length ?? 10
    const casing = options.casing ?? 'mixed'

    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

    let chars = ''
    if (casing === 'lower') chars = lower
    else if (casing === 'upper') chars = upper
    else chars = lower + upper

    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars[this.random.int(0, chars.length - 1)]
    }

    return result
  }

  alphanumeric(options: StringGeneratorOptions = {}): string {
    const length = options.length ?? 10
    const casing = options.casing ?? 'mixed'

    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'

    let chars = numbers
    if (casing === 'lower') chars += lower
    else if (casing === 'upper') chars += upper
    else chars += lower + upper

    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars[this.random.int(0, chars.length - 1)]
    }

    return result
  }

  numeric(length = 10): string {
    const numbers = '0123456789'
    let result = ''

    for (let i = 0; i < length; i++) {
      result += numbers[this.random.int(0, 9)]
    }

    return result
  }

  hexadecimal(length = 10): string {
    const hex = '0123456789abcdef'
    let result = '0x'

    for (let i = 0; i < length; i++) {
      result += hex[this.random.int(0, 15)]
    }

    return result
  }

  binary(length = 8): string {
    let result = '0b'

    for (let i = 0; i < length; i++) {
      result += this.random.int(0, 1)
    }

    return result
  }

  octal(length = 8): string {
    let result = '0o'

    for (let i = 0; i < length; i++) {
      result += this.random.int(0, 7)
    }

    return result
  }

  sample(pattern: string): string {
    return pattern.replace(/[#?@]/g, (char: string): string => {
      if (char === '#') {
        return String(this.random.int(0, 9))
      } else if (char === '?') {
        const letters = 'abcdefghijklmnopqrstuvwxyz'
        return letters[this.random.int(0, letters.length - 1)]!
      } else if (char === '@') {
        const alphanumeric = 'abcdefghijklmnopqrstuvwxyz0123456789'
        return alphanumeric[this.random.int(0, alphanumeric.length - 1)]!
      }
      return char
    })
  }
}