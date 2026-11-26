import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assetUsages, demoResources, parseProject, validatePublish, validateReferences } from '../src/game/schema.mjs'
import { projectStore } from '../scripts/storage.mjs'

const template = JSON.parse(await readFile(new URL('../data/default.json',import.meta.url),'utf8'))
const fixture = () => structuredClone(template)
const picture = { id:'qa-asset',name:'测试头像',category:'头像',mime:'image/png',data:'data:image/png;base64,aGVsbG8=' }

test('默认项目可构建。引用校验发现重复 ID、素材格式错误和丢失关联', () => {
  assert.deepEqual(validateReferences(validatePublish(fixture())),[])
  const project = fixture()
  project.assets = [picture]
  project.apps[0].icon = picture.id
  project.theme.wallpaper = picture.id
  assert.equal(assetUsages(project,picture.id).length,2)
  project.notes.push({ id:project.apps[0].id,title:'占位',body:'',date:'',asset:'missing' })
  const errors = validateReferences(parseProject(project)).join('\n')
  assert.match(errors,/资源 ID 重复/)
  assert.match(errors,/关联资源缺失/)
  project.assets[0] = { ...picture,data:'https://example.invalid/image.png' }
  assert.throws(() => parseProject(project),/Base64/)
})

test('测试库可以保存为草稿，发布校验拦截独立测试资源', () => {
  const project = fixture()
  project.flags.push({id:'demo-flag',name:'测试状态'})
  assert.deepEqual(demoResources(project),['demo-flag'])
  assert.equal(parseProject(project).flags.length,1)
  assert.throws(() => validatePublish(project),/独立测试资源/)
})

test('写入磁盘、跨实例读取、拒绝版本冲突与越界保存路径', async () => {
  const root = await mkdtemp(join(tmpdir(),'medellin-storage-'))
  try {
    await mkdir(join(root,'data'))
    const store = projectStore(root)
    assert.deepEqual(await store.read('draft'),{project:null,revision:null})
    const original = fixture()
    const first = await store.write('draft',original,null)
    const later = fixture()
    later.assets = [picture]
    const second = await store.write('draft',later,first.revision)
    assert.deepEqual(await projectStore(root).read('draft'),{project:later,revision:second.revision})
    await assert.rejects(store.write('draft',original,first.revision),{status:409})
    await assert.rejects(store.write('../outside',original),/未知保存目标/)
    await writeFile(join(root,'outside.json'),'untouched')
    await symlink(join(root,'outside.json'),join(root,'data','published.json'))
    await assert.rejects(store.write('published',original),/普通文件/)
    assert.equal(await readFile(join(root,'outside.json'),'utf8'),'untouched')
  } finally { await rm(root,{recursive:true,force:true}) }
})
