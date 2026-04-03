export interface FakerOptions {
  seed?: number
  locale?: string
}

export interface StringGeneratorOptions {
  length?: number
  casing?: 'upper' | 'lower' | 'mixed'
}

export interface NumberGeneratorOptions {
  min?: number
  max?: number
  precision?: number
}

export interface DateGeneratorOptions {
  from?: Date
  to?: Date
  refDate?: Date
}

export interface EmailOptions {
  firstName?: string
  lastName?: string
  provider?: string
}

export interface PasswordOptions {
  length?: number
  memorable?: boolean
  pattern?: RegExp
  prefix?: string
}

export interface PersonNameOptions {
  gender?: 'male' | 'female'
}

export interface PriceOptions {
  min?: number
  max?: number
  dec?: number
  symbol?: string
}

export interface AddressOptions {
  useFullAddress?: boolean
}

export type Gender = 'male' | 'female'

export interface RandomGenerator {
  next(): number
  seed(value: number): void
}