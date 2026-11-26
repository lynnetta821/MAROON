import { createHash, randomUUID } from 'node:crypto'
import { lstat, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseProject, validatePublish } from '../src/game/schema.mjs'

const files = { draft: 'draft.json', published: 'published.json' }
export function revision(text) {
  return createHash('sha256').update(text).digest('hex')
}
export function projectStore(root) {
  const directory = resolve(root, 'data')
  const filePath = async name => {
    if (!Object.hasOwn(files, name)) throw new Error('未知保存目标')
    if (await realpath(directory) !== directory) throw new Error('data 必须是项目内的实际目录')
    const destination = resolve(directory, files[name])
    if (dirname(destination) !== directory) throw new Error('保存路径无效')
    const info = await lstat(destination).catch(error => { if (error.code !== 'ENOENT') throw error })
    if (info && !info.isFile()) throw new Error('保存目标必须是普通文件')
    return destination
  }
  const read = async name => {
    const file = await filePath(name)
    try {
      const text = await readFile(file, 'utf8')
      return { project: parseProject(JSON.parse(text)), revision: revision(text) }
    } catch (error) {
      if (error.code === 'ENOENT') return { project: null, revision: null }
      throw error
    }
  }
  let pending = Promise.resolve()
  const write = (name, input, expected) => {
    const operation = pending.then(async () => {
      const project = name === 'published' ? validatePublish(input) : parseProject(input)
      const file = await filePath(name)
      if (expected !== undefined && expected !== (await read(name)).revision) {
        throw Object.assign(new Error('文件已在其他标签页或程序中修改。请先导出当前更改，再刷新载入。'), { status: 409 })
      }
      const text = JSON.stringify(project, null, 2) + '\n'
      const temporary = resolve(directory, randomUUID() + '.tmp')
      try {
        await writeFile(temporary, text, { flag: 'wx' })
        await rename(temporary, file)
      } finally {
        await rm(temporary, { force: true })
      }
      return { revision: revision(text) }
    })
    pending = operation.catch(() => {})
    return operation
  }
  return { read, write }
}
