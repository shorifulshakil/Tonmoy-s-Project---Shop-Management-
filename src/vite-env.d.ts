interface ImportMetaEnv {
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  // Add custom env variables here as needed.
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
