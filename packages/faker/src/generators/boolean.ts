import type { SeededRandom } from '../seed.ts'

export class BooleanGenerator {
  constructor(private random: SeededRandom) {}

  boolean(probability = 0.5): boolean {
    return this.random.boolean(probability)
  }
}