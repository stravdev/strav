import type { SeededRandom } from '../seed.ts'

export class ArrayGenerator {
  constructor(private random: SeededRandom) {}

  element<T>(array: T[]): T {
    return this.random.arrayElement(array)
  }

  elements<T>(array: T[], count?: number): T[] {
    return this.random.arrayElements(array, count)
  }

  shuffle<T>(array: T[]): T[] {
    return this.random.shuffle(array)
  }
}