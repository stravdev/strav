import type { SeededRandom } from '../seed.ts'
import type { PriceOptions } from '../types.ts'
import { productAdjectives, productMaterials, productNames, departments } from '../data/words.ts'

export class CommerceModule {
  constructor(private random: SeededRandom) {}

  productName(): string {
    const adjective = this.random.arrayElement(productAdjectives)
    const material = this.random.arrayElement(productMaterials)
    const product = this.random.arrayElement(productNames)

    return `${adjective} ${material} ${product}`
  }

  price(options: PriceOptions = {}): string {
    const min = options.min ?? 1
    const max = options.max ?? 1000
    const dec = options.dec ?? 2
    const symbol = options.symbol ?? '$'

    const price = this.random.float(min, max, dec)
    return `${symbol}${price.toFixed(dec)}`
  }

  priceFloat(min = 1, max = 1000): number {
    return this.random.float(min, max, 2)
  }

  productAdjective(): string {
    return this.random.arrayElement(productAdjectives)
  }

  productMaterial(): string {
    return this.random.arrayElement(productMaterials)
  }

  product(): string {
    return this.random.arrayElement(productNames)
  }

  productDescription(): string {
    const adjectives = [
      this.random.arrayElement(productAdjectives),
      this.random.arrayElement(productAdjectives),
      this.random.arrayElement(productMaterials),
    ]

    const features = ['ergonomic design', 'premium quality', 'eco-friendly', 'durable construction', 'modern style', 'versatile functionality', 'easy maintenance', 'compact size', 'innovative technology', 'superior performance']

    const feature1 = this.random.arrayElement(features)
    const feature2 = this.random.arrayElement(features.filter(f => f !== feature1))

    return `The ${adjectives[0]?.toLowerCase() ?? 'quality'} ${adjectives[2]?.toLowerCase() ?? 'material'} product features ${feature1} and ${feature2}. Perfect for everyday use.`
  }

  department(): string {
    return this.random.arrayElement(departments)
  }

  isbn(): string {
    const isbn = `978-${this.random.int(0, 9)}-${this.random.int(10, 99)}-${this.random.int(100000, 999999)}-${this.random.int(0, 9)}`
    return isbn
  }

  ean13(): string {
    let ean = ''
    for (let i = 0; i < 12; i++) {
      ean += this.random.int(0, 9)
    }

    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(ean[i] ?? '0') * (i % 2 === 0 ? 1 : 3)
    }
    const checkDigit = (10 - (sum % 10)) % 10

    return ean + checkDigit
  }

  ean8(): string {
    let ean = ''
    for (let i = 0; i < 7; i++) {
      ean += this.random.int(0, 9)
    }

    let sum = 0
    for (let i = 0; i < 7; i++) {
      sum += parseInt(ean[i] ?? '0') * (i % 2 === 0 ? 3 : 1)
    }
    const checkDigit = (10 - (sum % 10)) % 10

    return ean + checkDigit
  }
}