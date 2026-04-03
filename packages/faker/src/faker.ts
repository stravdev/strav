import { SeededRandom } from './seed.ts'
import { StringGenerator } from './generators/string.ts'
import { NumberGenerator } from './generators/number.ts'
import { BooleanGenerator } from './generators/boolean.ts'
import { DateGenerator } from './generators/date.ts'
import { ArrayGenerator } from './generators/array.ts'
import { PersonModule } from './modules/person.ts'
import { InternetModule } from './modules/internet.ts'
import { LoremModule } from './modules/lorem.ts'
import { CompanyModule } from './modules/company.ts'
import { CommerceModule } from './modules/commerce.ts'
import { LocationModule } from './modules/location.ts'
import type { FakerOptions } from './types.ts'

export class Faker {
  private _random: SeededRandom
  private _locale: string

  public readonly string: StringGenerator
  public readonly number: NumberGenerator
  public readonly boolean: BooleanGenerator
  public readonly date: DateGenerator
  public readonly array: ArrayGenerator
  public readonly person: PersonModule
  public readonly internet: InternetModule
  public readonly lorem: LoremModule
  public readonly company: CompanyModule
  public readonly commerce: CommerceModule
  public readonly location: LocationModule

  constructor(options: FakerOptions = {}) {
    this._random = new SeededRandom(options.seed)
    this._locale = options.locale ?? 'en'

    this.string = new StringGenerator(this._random)
    this.number = new NumberGenerator(this._random)
    this.boolean = new BooleanGenerator(this._random)
    this.date = new DateGenerator(this._random)
    this.array = new ArrayGenerator(this._random)
    this.person = new PersonModule(this._random)
    this.internet = new InternetModule(this._random, this.person)
    this.lorem = new LoremModule(this._random)
    this.company = new CompanyModule(this._random)
    this.commerce = new CommerceModule(this._random)
    this.location = new LocationModule(this._random)
  }

  seed(value: number): void {
    this._random.seed(value)
  }

  setLocale(locale: string): void {
    this._locale = locale
  }

  many<T>(generator: () => T, count: number): T[] {
    const results: T[] = []
    for (let i = 0; i < count; i++) {
      results.push(generator())
    }
    return results
  }

  oneOf<T>(...values: T[]): T {
    return this._random.arrayElement(values)
  }

  maybe<T>(generator: () => T, options: { probability?: number } = {}): T | undefined {
    const probability = options.probability ?? 0.5
    return this._random.boolean(probability) ? generator() : undefined
  }
}

export const faker = new Faker()