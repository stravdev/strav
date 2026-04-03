import type { SeededRandom } from '../seed.ts'
import { loremWords } from '../data/words.ts'

export class LoremModule {
  constructor(private random: SeededRandom) {}

  word(): string {
    return this.random.arrayElement(loremWords)
  }

  words(count = 3): string {
    const words: string[] = []
    for (let i = 0; i < count; i++) {
      words.push(this.word())
    }
    return words.join(' ')
  }

  sentence(wordCount?: number): string {
    const count = wordCount ?? this.random.int(5, 15)
    const words = this.words(count)
    return words.charAt(0).toUpperCase() + words.slice(1) + '.'
  }

  sentences(count = 3, separator = ' '): string {
    const sentences: string[] = []
    for (let i = 0; i < count; i++) {
      sentences.push(this.sentence())
    }
    return sentences.join(separator)
  }

  paragraph(sentenceCount = 3): string {
    return this.sentences(sentenceCount)
  }

  paragraphs(count = 3, separator = '\n\n'): string {
    const paragraphs: string[] = []
    for (let i = 0; i < count; i++) {
      paragraphs.push(this.paragraph())
    }
    return paragraphs.join(separator)
  }

  lines(count = 3): string {
    const lines: string[] = []
    for (let i = 0; i < count; i++) {
      lines.push(this.sentence())
    }
    return lines.join('\n')
  }

  text(count = 1): string {
    return this.paragraphs(count)
  }

  slug(wordCount = 3): string {
    return this.words(wordCount).toLowerCase().replace(/ /g, '-')
  }
}