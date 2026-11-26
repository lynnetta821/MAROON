import { randomBytes } from 'node:crypto'
import { maxProject } from '../src/game/schema.mjs'
import { projectStore } from './storage.mjs'

const isLoopback = host => ['localhost','127.0.0.1','::1','[::1]'].includes(host)
/** @returns {import("vite").Plugin} */
export function studioApi() {
  return {
    name: 'medellin-studio-local',
    apply: 'serve',
    configureServer(server) {
      const host = server.config.server.host
      if (host !== undefined && (typeof host !== 'string' || !isLoopback(host))) return
      const token = randomBytes(32).toString('hex')
      const store = projectStore(server.config.root)
      server.watcher.unwatch(server.config.root + '/data/draft.json')
      server.middlewares.use('/__arg_studio', async (req,res) => {
        const send = (status, body) => {
          res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff' })
          res.end(JSON.stringify(body))
        }
        try {
          const origin = new URL('http://' + req.headers.host)
          if (!isLoopback(origin.hostname) || (req.headers.origin && req.headers.origin !== origin.origin) ||
            req.headers['sec-fetch-site'] === 'cross-site') return send(403, { error:'仅允许本机同源访问。' })
          if (req.url === '/project' && req.method === 'GET') {
            return send(200, { token, draft: await store.read('draft'), published: await store.read('published') })
          }
          if (req.url !== '/project' || req.method !== 'PUT') return send(404, { error:'未知接口。' })
          if (req.headers['x-arg-studio'] !== token || !/^application\/json\b/.test(req.headers['content-type'] || ''))
            return send(403, { error:'保存请求未通过本地校验。' })
          let bytes = 0
          const chunks = []
          for await (const chunk of req) {
            bytes += chunk.length
            if (bytes > maxProject) {
              req.resume()
              return send(413, { error:'项目超过 36 MiB。' })
            }
            chunks.push(chunk)
          }
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          if (!['draft','published'].includes(body.target) || !(body.revision === null || /^[0-9a-f]{64}$/.test(body.revision || '')))
            return send(400, { error:'保存目标或版本无效。' })
          const result = await store.write(body.target, body.project, body.revision)
          send(200, result)
        } catch (error) {
          send(error.status || 400, { error: error.message || '保存失败' })
        }
      })
    }
  }
}
