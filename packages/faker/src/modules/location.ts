import type { SeededRandom } from '../seed.ts'
import type { AddressOptions } from '../types.ts'
import {
  streetSuffixes,
  streetNames,
  cities,
  states,
  stateAbbrs,
  countries,
  countryCodes,
} from '../data/locations.ts'

export class LocationModule {
  constructor(private random: SeededRandom) {}

  streetName(): string {
    const name = this.random.arrayElement(streetNames)
    const suffix = this.random.arrayElement(streetSuffixes)
    return `${name} ${suffix}`
  }

  streetAddress(options: AddressOptions = {}): string {
    const useFullAddress = options.useFullAddress ?? false
    const streetNumber = this.random.int(1, 9999)
    const streetName = this.streetName()

    if (useFullAddress) {
      const apartment = this.random.boolean(0.3) ? ` Apt. ${this.random.int(1, 999)}` : ''
      return `${streetNumber} ${streetName}${apartment}`
    }

    return `${streetNumber} ${streetName}`
  }

  city(): string {
    return this.random.arrayElement(cities)
  }

  state(options: { abbr?: boolean } = {}): string {
    return options.abbr ? this.random.arrayElement(stateAbbrs) : this.random.arrayElement(states)
  }

  zipCode(): string {
    const formats = [
      () => String(this.random.int(10000, 99999)),
      () => `${this.random.int(10000, 99999)}-${this.random.int(1000, 9999)}`,
    ]
    return this.random.arrayElement(formats)()
  }

  country(): string {
    return this.random.arrayElement(countries)
  }

  countryCode(): string {
    return this.random.arrayElement(countryCodes)
  }

  latitude(): number {
    return this.random.float(-90, 90, 6)
  }

  longitude(): number {
    return this.random.float(-180, 180, 6)
  }

  coordinates(): { lat: number; lng: number } {
    return {
      lat: this.latitude(),
      lng: this.longitude(),
    }
  }

  nearbyCoordinates(
    centerLat: number,
    centerLng: number,
    radiusInKm = 10
  ): { lat: number; lng: number } {
    const radiusInDegrees = radiusInKm / 111.32

    const lat = centerLat + this.random.float(-radiusInDegrees, radiusInDegrees, 6)
    const lng = centerLng + this.random.float(-radiusInDegrees, radiusInDegrees, 6)

    return { lat, lng }
  }

  timeZone(): string {
    const timeZones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'America/Anchorage',
      'Pacific/Honolulu',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Moscow',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Dubai',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland',
    ]
    return this.random.arrayElement(timeZones)
  }

  buildingNumber(): string {
    return String(this.random.int(1, 9999))
  }

  secondaryAddress(): string {
    const formats = [
      () => `Apt. ${this.random.int(1, 999)}`,
      () => `Suite ${this.random.int(100, 999)}`,
      () => `Unit ${this.random.int(1, 99)}`,
      () => `Floor ${this.random.int(1, 50)}`,
    ]
    return this.random.arrayElement(formats)()
  }

  fullAddress(): string {
    const street = this.streetAddress({ useFullAddress: true })
    const city = this.city()
    const state = this.state({ abbr: true })
    const zip = this.zipCode()

    return `${street}\n${city}, ${state} ${zip}`
  }

  direction(): string {
    const directions = ['North', 'East', 'South', 'West', 'Northeast', 'Northwest', 'Southeast', 'Southwest']
    return this.random.arrayElement(directions)
  }

  cardinalDirection(): string {
    return this.random.arrayElement(['North', 'East', 'South', 'West'])
  }

  ordinalDirection(): string {
    return this.random.arrayElement(['Northeast', 'Northwest', 'Southeast', 'Southwest'])
  }
}