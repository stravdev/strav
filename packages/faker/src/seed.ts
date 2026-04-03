import type { RandomGenerator } from './types.ts'

export class SeededRandom implements RandomGenerator {
  private _seed: number

  constructor(seed?: number) {
    this._seed = seed ?? Date.now()
  }

  seed(value: number): void {
    this._seed = value
  }

  next(): number {
    this._seed = (this._seed * 1103515245 + 12345) & 0x7fffffff
    return this._seed / 0x7fffffff
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  float(min: number, max: number, precision = 2): number {
    const value = this.next() * (max - min) + min
    return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision)
  }

  boolean(probability = 0.5): boolean {
    return this.next() < probability
  }

  arrayElement<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Array cannot be empty')
    }
    return array[this.int(0, array.length - 1)]!
  }

  arrayElements<T>(array: T[], count?: number): T[] {
    const num = count ?? this.int(1, array.length)
    const shuffled = [...array]

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
    }

    return shuffled.slice(0, num)
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array]

    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[result[i], result[j]] = [result[j]!, result[i]!]
    }

    return result
  }
}