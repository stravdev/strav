import type { SeededRandom } from '../seed.ts'
import type { DateGeneratorOptions } from '../types.ts'

export class DateGenerator {
  constructor(private random: SeededRandom) {}

  between(options: DateGeneratorOptions = {}): Date {
    const from = options.from ?? new Date('2020-01-01')
    const to = options.to ?? new Date('2030-12-31')

    const fromTime = from.getTime()
    const toTime = to.getTime()
    const randomTime = fromTime + this.random.next() * (toTime - fromTime)

    return new Date(randomTime)
  }

  recent(days = 7, refDate?: Date): Date {
    const ref = refDate ?? new Date()
    const millisecondsInDay = 24 * 60 * 60 * 1000
    const recentTime = ref.getTime() - this.random.next() * days * millisecondsInDay

    return new Date(recentTime)
  }

  soon(days = 7, refDate?: Date): Date {
    const ref = refDate ?? new Date()
    const millisecondsInDay = 24 * 60 * 60 * 1000
    const soonTime = ref.getTime() + this.random.next() * days * millisecondsInDay

    return new Date(soonTime)
  }

  past(years = 1, refDate?: Date): Date {
    const ref = refDate ?? new Date()
    const millisecondsInYear = 365 * 24 * 60 * 60 * 1000
    const pastTime = ref.getTime() - this.random.next() * years * millisecondsInYear

    return new Date(pastTime)
  }

  future(years = 1, refDate?: Date): Date {
    const ref = refDate ?? new Date()
    const millisecondsInYear = 365 * 24 * 60 * 60 * 1000
    const futureTime = ref.getTime() + this.random.next() * years * millisecondsInYear

    return new Date(futureTime)
  }

  birthdate(options: { min?: number; max?: number; mode?: 'age' | 'year' } = {}): Date {
    const mode = options.mode ?? 'age'
    const currentYear = new Date().getFullYear()

    if (mode === 'age') {
      const minAge = options.min ?? 18
      const maxAge = options.max ?? 80

      const birthYear = currentYear - this.random.int(minAge, maxAge)
      const birthMonth = this.random.int(0, 11)
      const birthDay = this.random.int(1, 28)

      return new Date(birthYear, birthMonth, birthDay)
    } else {
      const minYear = options.min ?? 1940
      const maxYear = options.max ?? currentYear - 18

      const birthYear = this.random.int(minYear, maxYear)
      const birthMonth = this.random.int(0, 11)
      const birthDay = this.random.int(1, 28)

      return new Date(birthYear, birthMonth, birthDay)
    }
  }

  month(options: { abbr?: boolean } = {}): string {
    const months = options.abbr
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ]

    return this.random.arrayElement(months)
  }

  weekday(options: { abbr?: boolean } = {}): string {
    const weekdays = options.abbr
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return this.random.arrayElement(weekdays)
  }
}