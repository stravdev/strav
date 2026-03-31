export interface ConfigData {
  [key: string]: any
}

export interface ConfigurationLoader {
  supports(filePath: string): boolean
  load(filePath: string, environment?: string): Promise<ConfigData>
}
