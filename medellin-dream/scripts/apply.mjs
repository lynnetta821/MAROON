import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { projectStore } from './storage.mjs'
import { maxProject } from '../src/game/schema.mjs'

try {
  const [, , path, mode] = process.argv
  if (!path || (mode && mode !== '--draft')) throw new Error('用法：npm run apply -- <导出的项目.json> [--draft]')
  if ((await stat(path)).size > maxProject) throw new Error('项目超过 36 MiB。')
  const project = JSON.parse(await readFile(path, 'utf8'))
  const target = mode === '--draft' ? 'draft' : 'published'
  const store = projectStore(fileURLToPath(new URL('..', import.meta.url)))
  const { revision } = await store.read(target)
  await store.write(target, project, revision)
  console.log('已更新 data/' + target + '.json')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
