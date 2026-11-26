import { defineConfig } from 'vite'
import { studioApi } from './scripts/dev-api.mjs'

export default defineConfig(({ command,isPreview }) => ({
  base: './',
  define: {
    __STUDIO_LOCAL__: command === 'serve' && !isPreview,
    ...(command === 'build' ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {})
  },
  optimizeDeps: { include: ['react','react-dom/client','react/jsx-dev-runtime'] },
  esbuild: command === 'build' ? { jsxDev: false } : undefined,
  plugins: [studioApi()],
  server: {
    host: '127.0.0.1',
    watch: { ignored: ['**/data/draft.json','**/data/published.json','**/data/*.tmp'] },
    fs: { deny: ['.env','.env.*','*.{crt,pem}','**/.git/**','**/data/draft.json','**/data/*.tmp'] }
  }
}))
