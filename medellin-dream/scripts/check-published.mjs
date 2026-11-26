import { readFile } from 'node:fs/promises'
import { validatePublish } from '../src/game/schema.mjs'

try {
  const project = await readFile(new URL('../data/published.json',import.meta.url),'utf8')
  validatePublish(JSON.parse(project))
} catch (error) {
  console.error('正式项目校验失败\n' + error.message)
  process.exitCode = 1
}
