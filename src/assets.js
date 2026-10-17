// Public files must follow Vite's base path when mounted beside the existing site.
export function assetUrl(path){return `${import.meta.env?.BASE_URL||'/'}${path.replace(/^\/+/, '')}`;}
