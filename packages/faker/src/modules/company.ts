import type { SeededRandom } from '../seed.ts'
import { lastNames } from '../data/names.ts'
import { businessWords } from '../data/words.ts'

export class CompanyModule {
  constructor(private random: SeededRandom) {}

  companyName(): string {
    const formats = [
      () => `${this.random.arrayElement(lastNames)} ${this.companySuffix()}`,
      () => `${this.random.arrayElement(lastNames)}-${this.random.arrayElement(lastNames)}`,
      () => `${this.random.arrayElement(lastNames)}, ${this.random.arrayElement(lastNames)} and ${this.random.arrayElement(lastNames)}`,
      () => `${this.random.arrayElement(businessWords)} ${this.companySuffix()}`,
      () => `${this.random.arrayElement(businessWords)} ${this.random.arrayElement(businessWords)}`,
    ]

    return this.random.arrayElement(formats)()
  }

  companySuffix(): string {
    const suffixes = ['Inc', 'Corp', 'LLC', 'Group', 'Holdings', 'Industries', 'Enterprises', 'Solutions', 'Services', 'Partners', 'International', 'Technologies', 'Ventures', 'Capital', 'Consulting', 'Associates', 'Systems', 'Global']
    return this.random.arrayElement(suffixes)
  }

  catchPhrase(): string {
    const adjectives = ['Advanced', 'Automated', 'Balanced', 'Business-focused', 'Centralized', 'Compatible', 'Configurable', 'Cross-platform', 'Customer-focused', 'Customizable', 'Decentralized', 'Digitized', 'Distributed', 'Diverse', 'Down-sized', 'Enhanced', 'Enterprise-wide', 'Exclusive', 'Expanded', 'Extended']
    const descriptors = ['24/7', '24/365', '3rd generation', '4th generation', '5th generation', 'actuating', 'analyzing', 'asymmetric', 'asynchronous', 'attitude-oriented', 'background', 'bandwidth-monitored', 'bi-directional', 'bifurcated', 'bottom-line', 'clear-thinking', 'client-driven', 'client-server', 'coherent', 'cohesive']
    const nouns = ['ability', 'access', 'adapter', 'algorithm', 'alliance', 'analyzer', 'application', 'approach', 'architecture', 'archive', 'artificial intelligence', 'array', 'attitude', 'benchmark', 'budgetary management', 'capability', 'capacity', 'challenge', 'circuit', 'collaboration']

    const adjective = this.random.arrayElement(adjectives)
    const descriptor = this.random.arrayElement(descriptors)
    const noun = this.random.arrayElement(nouns)

    return `${adjective} ${descriptor} ${noun}`
  }

  bs(): string {
    const verbs = ['implement', 'utilize', 'integrate', 'streamline', 'optimize', 'evolve', 'transform', 'embrace', 'enable', 'orchestrate', 'leverage', 'reinvent', 'aggregate', 'architect', 'enhance', 'incentivize', 'morph', 'empower', 'facilitate', 'synergize']
    const adjectives = ['clicks-and-mortar', 'value-added', 'vertical', 'proactive', 'robust', 'revolutionary', 'scalable', 'leading-edge', 'innovative', 'intuitive', 'strategic', 'e-business', 'mission-critical', 'sticky', 'one-to-one', '24/7', 'end-to-end', 'global', 'B2B', 'B2C']
    const nouns = ['synergies', 'paradigms', 'markets', 'partnerships', 'infrastructures', 'platforms', 'initiatives', 'channels', 'eyeballs', 'communities', 'ROI', 'solutions', 'e-services', 'action-items', 'portals', 'niches', 'technologies', 'content', 'supply-chains', 'convergence']

    const verb = this.random.arrayElement(verbs)
    const adjective = this.random.arrayElement(adjectives)
    const noun = this.random.arrayElement(nouns)

    return `${verb} ${adjective} ${noun}`
  }

  buzzword(): string {
    return this.random.arrayElement(businessWords)
  }

  ein(): string {
    return `${this.random.int(10, 99)}-${this.random.int(1000000, 9999999)}`
  }

  dunsNumber(): string {
    return String(this.random.int(100000000, 999999999))
  }
}