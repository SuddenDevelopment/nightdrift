/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Injected from package.json by vite.config.ts. Single source of truth. */
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
