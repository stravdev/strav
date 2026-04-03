import type { SeededRandom } from '../seed.ts'
import type { NumberGeneratorOptions } from '../types.ts'

export class NumberGenerator {
  constructor(private random: SeededRandom) {}

  int(min = 0, max = Number.MAX_SAFE_INTEGER): number {
    return this.random.int(min, max)
  }

  float(options: NumberGeneratorOptions = {}): number {
    const min = options.min ?? 0
    const max = options.max ?? 1
    const precision = options.precision ?? 2

    return this.random.float(min, max, precision)
  }

  bigint(min = 0n, max = BigInt(Number.MAX_SAFE_INTEGER)): bigint {
    const range = max - min
    const randomBigInt = BigInt(Math.floor(this.random.next() * Number(range)))
    return min + randomBigInt
  }

  binary(): 0 | 1 {
    return this.random.int(0, 1) as 0 | 1
  }

  octal(max = 7): number {
    return this.random.int(0, max)
  }

  hex(): number {
    return this.random.int(0, 15)
  }
}