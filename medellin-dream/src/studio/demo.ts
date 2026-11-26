import type { Contact, Message, Project } from '../game/types'

const contact = (id: string, name: string, color: string, signature: string, initial = true): Contact => ({
  id: 'demo-' + id, name, account: 'demo.' + id, remark: '', avatar: '', color, signature,
  region: '测试地区', bio: '占位人物，用于验证通讯录和好友名片。', custom: [], hidden: [], initial, searchable: true, cover: ''
})
const message = (id: number, sender: string, type: Message['type'], text: string, time = '', url = ''): Message => ({
  id: 'demo-msg-' + id, sender: sender === 'self' || sender === '' ? sender : 'demo-' + sender, type, text, time, media: '', url
})
export function createDemo(base: Project): Project {
  const demo = structuredClone(base)
  demo.flags = [{ id: 'demo-access', name: '发现联系线索（测试）' }]
  demo.clues = [{ id: 'demo-clue', name: '学生系统入口（测试）' }]
  demo.contacts = [
    contact('lin', '林小满', '#c07888', '先做个记录。'),
    contact('chen', '陈序', '#6579c0', '占位签名，可在工作室替换。'),
    contact('yu', '许知遥', '#5e917c', '今天也在整理资料。'),
    { ...contact('locked', '测试联系人', '#a57645', '用于验证条件解锁。', false),
      unlock: { mode: 'all', rules: [{ kind: 'flag', target: 'demo-access', value: true }] } },
  ]
  demo.threads = [
    { id: 'demo-group', name: '星之队闲聊', kind: 'group', avatar: '', members: [
      { contact: 'demo-lin', nickname: '' }, { contact: 'demo-chen', nickname: '' }, { contact: 'demo-yu', nickname: '' },
    ], announcement: '此群仅用于测试群聊、内部链接与好友名片。正式群聊内容待作者填写。', messages: [
      message(1, '', 'date', '2026年11月26日  星期四'),
      message(2, 'lin', 'text', '先把学生系统的测试入口放在群里。', '09:12'),
      message(3, 'lin', 'link', '学生信息系统 · 测试入口', '09:12', 'campus.local'),
      message(4, 'chen', 'text', '登录信息在桌面的「工作备忘录」里，可以一起对照。', '09:14'),
      message(5, 'self', 'text', '收到，我先去看看。', '09:16'),
      message(6, '', 'system', '以上为测试记录 · 正式聊天内容待编写'),
    ] },
    { id: 'demo-direct-lin', name: '', kind: 'direct', avatar: '', members: [{ contact: 'demo-lin', nickname: '' }], announcement: '', messages: [
      message(7, 'lin', 'text', '这是一条单人聊天测试消息。', '08:57'),
    ] },
    { id: 'demo-direct-chen', name: '', kind: 'direct', avatar: '', members: [{ contact: 'demo-chen', nickname: '' }], announcement: '', messages: [
      message(8, 'chen', 'text', '备忘录里有一组虚构账号。', '08:52'),
    ] },
    { id: 'demo-direct-yu', name: '', kind: 'direct', avatar: '', members: [{ contact: 'demo-yu', nickname: '' }], announcement: '', messages: [
      message(9, 'yu', 'text', '这条记录用于测试通讯录。', '昨天'),
    ] },
  ]
  demo.posts = [{ id: 'demo-post', author: 'demo-lin', text: '朋友圈测试动态。正式内容待编写。', time: '2026-11-26 08:20', location: '测试校区', images: [], layout: 'grid',
    likes: ['demo-chen'], comments: [{ id: 'demo-comment', sender: 'demo-yu', text: '测试评论。', replyTo: '' }], hiddenClue: '' }]
  demo.pages = [{ id: 'demo-campus', title: '学生信息系统', url: 'campus.local', body: '这是一页用于验证登录和剧情事件的占位内容。', image: '', kind: 'student', layout: 'article', actionLabel: '' }]
  demo.search = [{ id: 'demo-result', title: '学生信息系统', keywords: '学生系统, 学生信息, 校园, campus', summary: '校内学生资料入口 · 演示页面', thumbnail: '', page: 'demo-campus', order: 0 }]
  demo.accounts = [{ id: 'demo-account', name: '学生系统测试账号', username: '40350947', password: 'JXXY0000', page: 'demo-campus', onLogin: { kind: 'unlock', target: 'demo-access' } }]
  demo.notes = [{ id: 'demo-note', title: '学生系统账号（测试）', body: '仅用于虚构学生信息系统\n\n账号：40350947\n密码：JXXY0000', date: '2026-11-26', asset: '' }]
  demo.trash = [{ id: 'demo-trash', title: '入口记录.txt（测试）', body: 'campus.local\n\n这是一条用于测试回收站的占位文件。', date: '2026-11-26', asset: '', action: { kind: 'clue', target: 'demo-clue' } }]
  return demo
}
