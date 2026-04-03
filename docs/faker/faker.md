# Faker

Simple and powerful fake data generator for testing in the Strav framework. Provides essential data generation with reproducible seeding support for consistent test results.

## Quick Start

```typescript
import { faker } from '@strav/faker'

// Generate various types of data
faker.person.fullName()        // "John Smith"
faker.internet.email()         // "john.smith@gmail.com"
faker.commerce.productName()   // "Ergonomic Steel Chair"
faker.location.city()          // "San Francisco"
faker.lorem.sentence()         // "Lorem ipsum dolor sit amet consectetur."

// Seed for reproducible tests
faker.seed(123)
const name1 = faker.person.fullName()
faker.seed(123)
const name2 = faker.person.fullName()
// name1 === name2 ✅
```

## Core Concepts

### Seeding

The faker uses a seeded random number generator to ensure reproducible results in tests:

```typescript
import { faker, Faker } from '@strav/faker'

// Use the global instance with seeding
faker.seed(42)
faker.person.firstName() // Always returns the same name for seed 42

// Create custom instances with different seeds
const faker1 = new Faker({ seed: 100 })
const faker2 = new Faker({ seed: 200 })
```

### Helper Methods

Generate multiple values or conditional data:

```typescript
// Generate multiple items
faker.many(() => faker.person.fullName(), 5)
// ["John Smith", "Jane Doe", "Bob Johnson", "Alice Brown", "Charlie Wilson"]

// Pick from options
faker.oneOf('red', 'green', 'blue') // One of the three colors

// Conditional generation
faker.maybe(() => faker.person.jobTitle(), { probability: 0.7 })
// 70% chance to return a job title, 30% chance to return undefined
```

## String Generators

Generate various string formats and patterns:

```typescript
// Unique identifiers
faker.string.uuid()        // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
faker.string.nanoid(10)    // "V1StGXR8_Z"

// Character sets
faker.string.alpha({ length: 8 })                    // "AbCdEfGh"
faker.string.alpha({ length: 8, casing: 'lower' })   // "abcdefgh"
faker.string.alpha({ length: 8, casing: 'upper' })   // "ABCDEFGH"

faker.string.alphanumeric({ length: 10 })            // "A1b2C3d4E5"
faker.string.numeric(6)                              // "123456"

// Number formats
faker.string.hexadecimal(8)    // "0x1a2b3c4d"
faker.string.binary(8)         // "0b10110101"
faker.string.octal(8)          // "0o12345670"

// Pattern generation
faker.string.sample('###-??-@@@')  // "123-ab-x7z"
// # = digit, ? = letter, @ = alphanumeric
```

## Number Generators

Generate numeric values with constraints:

```typescript
// Integers
faker.number.int()           // Random integer
faker.number.int(1, 100)     // Integer between 1 and 100

// Floats
faker.number.float()                                    // Random float 0-1
faker.number.float({ min: 1.5, max: 10.5, precision: 2 }) // Float with 2 decimals

// Other numeric types
faker.number.bigint()        // Random BigInt
faker.number.binary()        // 0 or 1
faker.number.octal()         // 0-7
faker.number.hex()          // 0-15
```

## Date Generators

Generate dates relative to now or specific ranges:

```typescript
// Relative dates
faker.date.recent()          // Within last 7 days
faker.date.recent(30)        // Within last 30 days
faker.date.soon()           // Next 7 days
faker.date.soon(14)         // Next 14 days

// Absolute ranges
faker.date.past()           // Random date in past year
faker.date.future()         // Random date in next year
faker.date.between({
  from: new Date('2020-01-01'),
  to: new Date('2025-12-31')
})

// Birthdates
faker.date.birthdate()                     // Age 18-80
faker.date.birthdate({ min: 25, max: 65 }) // Age 25-65
faker.date.birthdate({
  mode: 'year',
  min: 1990,
  max: 2000
}) // Born between 1990-2000

// Date components
faker.date.month()              // "January"
faker.date.month({ abbr: true }) // "Jan"
faker.date.weekday()            // "Monday"
faker.date.weekday({ abbr: true }) // "Mon"
```

## Person Module

Generate person-related data:

```typescript
// Names
faker.person.firstName()                        // "John"
faker.person.firstName({ gender: 'female' })    // "Jane"
faker.person.lastName()                         // "Smith"
faker.person.fullName()                         // "John Smith"
faker.person.fullName({ gender: 'female' })     // "Jane Smith"

// Titles and identifiers
faker.person.prefix()           // "Mr.", "Dr.", "Prof."
faker.person.suffix()           // "Jr.", "PhD", "MD"
faker.person.gender()           // "male" or "female"

// Professional data
faker.person.jobTitle()         // "Software Engineer"
faker.person.bio()             // "Software Engineer with 5 years of experience..."

// Usernames
faker.person.username()                           // "johnsmith123"
faker.person.username('jane', 'doe')              // Username from specific names
```

## Internet Module

Generate internet and network-related data:

```typescript
// Email addresses
faker.internet.email()                              // "john@gmail.com"
faker.internet.email({
  firstName: 'john',
  lastName: 'doe',
  provider: 'company.com'
})                                                 // "john.doe@company.com"

// Passwords
faker.internet.password()                          // Complex password
faker.internet.password({ length: 16 })            // 16-character password
faker.internet.password({ memorable: true })       // "sunny123!"

// URLs and domains
faker.internet.url()                               // "https://tech.com/products"
faker.internet.domainName()                        // "tech.com"
faker.internet.domainWord()                        // "tech"

// Network data
faker.internet.ipAddress()                         // "192.168.1.1"
faker.internet.ipv6Address()                       // "2001:0db8:85a3::8a2e:370:7334"
faker.internet.mac()                               // "02:00:4c:4f:4f:50"
faker.internet.port()                              // 8080
faker.internet.userAgent()                         // Browser user agent string

// HTTP data
faker.internet.httpMethod()                        // "GET", "POST", etc.
faker.internet.httpStatusCode()                    // 200, 404, 500, etc.
faker.internet.protocol()                          // "https", "ftp", "ssh"

// Fun extras
faker.internet.emoji()                             // "😀"
```

## Lorem Module

Generate placeholder text:

```typescript
// Words and sentences
faker.lorem.word()             // "lorem"
faker.lorem.words(5)           // "lorem ipsum dolor sit amet"

faker.lorem.sentence()         // "Lorem ipsum dolor sit amet consectetur."
faker.lorem.sentence(10)       // Sentence with ~10 words
faker.lorem.sentences(3)       // Three sentences

// Paragraphs
faker.lorem.paragraph()        // One paragraph
faker.lorem.paragraphs(3)      // Three paragraphs
faker.lorem.paragraphs(2, '\n\n---\n\n') // Custom separator

// Other formats
faker.lorem.lines(3)           // Three lines of text
faker.lorem.text()             // Alias for paragraph()
faker.lorem.slug()             // "lorem-ipsum-dolor"
faker.lorem.slug(5)            // 5-word slug
```

## Company Module

Generate business-related data:

```typescript
// Company names
faker.company.companyName()    // "Smith & Associates"
faker.company.companySuffix()  // "Inc", "Corp", "LLC"

// Marketing copy
faker.company.catchPhrase()    // "Advanced 24/7 algorithm"
faker.company.bs()            // "implement value-added synergies"
faker.company.buzzword()      // "synergy"

// Business identifiers
faker.company.ein()           // "12-3456789" (Employer ID)
faker.company.dunsNumber()    // "123456789" (DUNS number)
```

## Commerce Module

Generate e-commerce and product data:

```typescript
// Products
faker.commerce.productName()        // "Ergonomic Steel Chair"
faker.commerce.productAdjective()   // "Ergonomic"
faker.commerce.productMaterial()    // "Steel"
faker.commerce.product()            // "Chair"
faker.commerce.productDescription() // Full product description

// Pricing
faker.commerce.price()                              // "$123.45"
faker.commerce.price({ min: 10, max: 100 })        // Price in range
faker.commerce.price({ symbol: '€', dec: 0 })      // "€45"
faker.commerce.priceFloat()                         // 123.45 (as number)

// Categories
faker.commerce.department()         // "Electronics"

// Barcodes
faker.commerce.isbn()              // "978-1-23-456789-0"
faker.commerce.ean13()             // "1234567890123"
faker.commerce.ean8()              // "12345678"
```

## Location Module

Generate geographic and address data:

```typescript
// Address components
faker.location.streetAddress()                    // "123 Main Street"
faker.location.streetAddress({ useFullAddress: true }) // "123 Main St Apt. 4"
faker.location.streetName()                       // "Main Street"
faker.location.buildingNumber()                   // "123"
faker.location.secondaryAddress()                 // "Apt. 4"

// Geographic areas
faker.location.city()              // "San Francisco"
faker.location.state()             // "California"
faker.location.state({ abbr: true }) // "CA"
faker.location.zipCode()           // "94102" or "94102-1234"
faker.location.country()           // "United States"
faker.location.countryCode()       // "US"

// Coordinates
faker.location.latitude()          // 37.7749
faker.location.longitude()         // -122.4194
faker.location.coordinates()       // { lat: 37.7749, lng: -122.4194 }

// Nearby coordinates (within radius)
faker.location.nearbyCoordinates(37.7749, -122.4194, 10)
// { lat: 37.7849, lng: -122.4094 } (within 10km)

// Full addresses
faker.location.fullAddress()       // Multi-line complete address

// Directions and time
faker.location.direction()         // "North", "Northeast"
faker.location.cardinalDirection() // "North", "South", "East", "West"
faker.location.ordinalDirection()  // "Northeast", "Southwest"
faker.location.timeZone()          // "America/Los_Angeles"
```

## Array Utilities

Work with arrays and collections:

```typescript
const colors = ['red', 'green', 'blue', 'yellow']

// Pick single element
faker.array.element(colors)        // "red"

// Pick multiple elements
faker.array.elements(colors, 2)    // ["red", "blue"]
faker.array.elements(colors)       // Random number of elements

// Shuffle array (returns new array)
faker.array.shuffle(colors)        // ["blue", "red", "yellow", "green"]
```

## Boolean Generator

Generate boolean values with probability control:

```typescript
faker.boolean.boolean()         // true or false (50% each)
faker.boolean.boolean(0.8)      // 80% chance of true
faker.boolean.boolean(0.1)      // 10% chance of true
```

## Advanced Usage

### Integration with @strav/testing

Combine faker with the Strav testing framework:

```typescript
import { TestCase, Factory } from '@strav/testing'
import { faker } from '@strav/faker'
import User from '../app/models/user'

// Use faker in model factories
const UserFactory = Factory.define(User, (seq) => ({
  pid: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  bio: faker.person.bio(),
  createdAt: faker.date.recent(30),
}))

describe('User tests', () => {
  test('creates realistic test data', async () => {
    // Seed for reproducible test data
    faker.seed(123)

    const user = await UserFactory.create()
    expect(user.name).toMatch(/^[A-Za-z\s]+$/)
    expect(user.email).toMatch(/@/)
  })
})
```

### Performance Considerations

For generating large amounts of data:

```typescript
// Generate many items efficiently
const users = faker.many(() => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email()
}), 1000)

// Use array operations for bulk generation
const names = Array.from({ length: 100 }, () => faker.person.fullName())
```

### Custom Seeding Strategies

Different approaches to seeding for various test scenarios:

```typescript
// Deterministic tests - same data every run
faker.seed(12345)

// Test-specific seeds
faker.seed(hash('test-name'))

// Time-based seeds for debugging
faker.seed(Date.now())

// Create isolated faker instances
const userFaker = new Faker({ seed: 100 })
const productFaker = new Faker({ seed: 200 })
```

## Best Practices

### Test Data Generation

1. **Use seeding for critical tests** that need reproducible data
2. **Generate realistic data** that matches your domain constraints
3. **Avoid hardcoded values** in favor of generated data
4. **Use factories** with faker for model creation

```typescript
// Good: Realistic, generated data
const user = {
  name: faker.person.fullName(),
  email: faker.internet.email(),
  age: faker.number.int(18, 80),
  joinDate: faker.date.past()
}

// Avoid: Hardcoded test data
const user = {
  name: 'Test User',
  email: 'test@test.com',
  age: 25,
  joinDate: new Date('2023-01-01')
}
```

### Data Consistency

Ensure related data makes sense together:

```typescript
const firstName = faker.person.firstName()
const lastName = faker.person.lastName()

const user = {
  firstName,
  lastName,
  fullName: `${firstName} ${lastName}`,
  email: faker.internet.email({ firstName, lastName }),
  username: faker.person.username(firstName, lastName)
}
```

### Locale Support

While the current version focuses on English data, you can extend patterns for other locales:

```typescript
// Future: Locale-specific data
const germanFaker = new Faker({ locale: 'de' })
germanFaker.person.firstName() // German names
```

## API Reference

### Core Types

```typescript
interface FakerOptions {
  seed?: number
  locale?: string
}

interface StringGeneratorOptions {
  length?: number
  casing?: 'upper' | 'lower' | 'mixed'
}

interface NumberGeneratorOptions {
  min?: number
  max?: number
  precision?: number
}

interface DateGeneratorOptions {
  from?: Date
  to?: Date
  refDate?: Date
}

// Additional option interfaces available for specific methods
```

### Main Classes

```typescript
class Faker {
  constructor(options?: FakerOptions)
  seed(value: number): void
  setLocale(locale: string): void
  many<T>(generator: () => T, count: number): T[]
  oneOf<T>(...values: T[]): T
  maybe<T>(generator: () => T, options?: { probability?: number }): T | undefined

  // Generator modules
  readonly string: StringGenerator
  readonly number: NumberGenerator
  readonly boolean: BooleanGenerator
  readonly date: DateGenerator
  readonly array: ArrayGenerator
  readonly person: PersonModule
  readonly internet: InternetModule
  readonly lorem: LoremModule
  readonly company: CompanyModule
  readonly commerce: CommerceModule
  readonly location: LocationModule
}

// Global instance
const faker: Faker
```

All generator methods are available on their respective modules with full type safety and IntelliSense support.