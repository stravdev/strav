export { Faker, faker } from './faker.ts'
export { SeededRandom } from './seed.ts'

export {
  StringGenerator,
  NumberGenerator,
  BooleanGenerator,
  DateGenerator,
  ArrayGenerator,
} from './generators/index.ts'

export {
  PersonModule,
  InternetModule,
  LoremModule,
  CompanyModule,
  CommerceModule,
  LocationModule,
} from './modules/index.ts'

export type {
  FakerOptions,
  StringGeneratorOptions,
  NumberGeneratorOptions,
  DateGeneratorOptions,
  EmailOptions,
  PasswordOptions,
  PersonNameOptions,
  PriceOptions,
  AddressOptions,
  Gender,
  RandomGenerator,
} from './types.ts'