/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_RATIONSWEB_API_URL?: string
  readonly VITE_ADMIN_BASE_DOMAIN?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
