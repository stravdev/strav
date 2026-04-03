import type { SeededRandom } from '../seed.ts'
import type { PersonNameOptions, Gender } from '../types.ts'
import { firstNamesMale, firstNamesFemale, lastNames, jobTitles } from '../data/names.ts'

export class PersonModule {
  constructor(private random: SeededRandom) {}

  firstName(options: PersonNameOptions = {}): string {
    const gender = options.gender ?? this.gender()
    const names = gender === 'male' ? firstNamesMale : firstNamesFemale
    return this.random.arrayElement(names)
  }

  lastName(): string {
    return this.random.arrayElement(lastNames)
  }

  fullName(options: PersonNameOptions = {}): string {
    return `${this.firstName(options)} ${this.lastName()}`
  }

  gender(): Gender {
    return this.random.boolean() ? 'male' : 'female'
  }

  prefix(gender?: Gender): string {
    const g = gender ?? this.gender()
    const prefixes = g === 'male' ? ['Mr.', 'Dr.', 'Prof.'] : ['Ms.', 'Mrs.', 'Miss', 'Dr.', 'Prof.']
    return this.random.arrayElement(prefixes)
  }

  suffix(): string {
    const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'PhD', 'MD', 'DDS', 'Esq.']
    return this.random.arrayElement(suffixes)
  }

  jobTitle(): string {
    return this.random.arrayElement(jobTitles)
  }

  bio(): string {
    const job = this.jobTitle()
    const years = this.random.int(1, 20)
    const hobbies = ['reading', 'traveling', 'coding', 'music', 'sports', 'photography', 'cooking', 'gaming']
    const hobby1 = this.random.arrayElement(hobbies)
    const hobby2 = this.random.arrayElement(hobbies.filter(h => h !== hobby1))

    return `${job} with ${years} years of experience. Passionate about ${hobby1} and ${hobby2}.`
  }

  username(firstName?: string, lastName?: string): string {
    const first = firstName ?? this.firstName().toLowerCase()
    const last = lastName ?? this.lastName().toLowerCase()
    const formats = [
      () => first,
      () => `${first}${last}`,
      () => `${first}.${last}`,
      () => `${first}_${last}`,
      () => `${first}${this.random.int(10, 9999)}`,
      () => `${last}${this.random.int(10, 9999)}`,
      () => `${first[0]}${last}`,
      () => `${first}${last[0]}`,
    ]

    return this.random.arrayElement(formats)()
  }
}