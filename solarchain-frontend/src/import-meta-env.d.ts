interface ImportMetaEnv {
  readonly NG_APP_PINATA_API_KEY?: string;
  readonly NG_APP_PINATA_API_SECRET?: string;
  readonly NG_APP_PINATA_JWT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
