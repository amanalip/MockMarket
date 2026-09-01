/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_RELEASE?: string;
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
