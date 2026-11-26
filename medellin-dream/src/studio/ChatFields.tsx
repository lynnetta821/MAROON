import { useState } from 'react'
import { Copy } from 'lucide-react'
import type { Contact, Message, Post, Thread } from '../game/types'
import { makeId } from '../game/state'
import { ActionField, AssetField, CheckList, ChoiceField, ConditionField, Fold, SmallButton, SortList, TextField, Toggle, choice, choiceList, contactChoices, peopleChoices, useStudio } from './controls'

export type Patch<T> = (patch: Partial<T>) => void
export function ContactFields({ row, patch }: { row: Contact; patch: Patch<Contact> }) {
  const { project, update } = useStudio()
  const memberOf = project.threads.filter(t => t.kind === 'group' && t.members.some(m => m.contact === row.id)).map(t => t.id)
  const options = [['name','昵称'],['avatar','头像'],['account','账号'],['remark','备注'],['signature','签名'],['region','地区'],['bio','人物简介'],['moments','朋友圈入口'],['chat','聊天入口']]
  return <>
    <TextField label="昵称" value={row.name} onChange={name => patch({name})} />
    <TextField label="游戏内账号" value={row.account} onChange={account => patch({account})} />
    <TextField label="备注名" value={row.remark} onChange={remark => patch({remark})} />
    <AssetField label="头像" value={row.avatar} onChange={avatar => patch({avatar})} />
    <TextField type="color" label="头像底色" value={row.color} onChange={color => patch({color})} />
    <TextField label="个性签名" value={row.signature} onChange={signature => patch({signature})} />
    <TextField label="地区" value={row.region} onChange={region => patch({region})} />
    <TextField label="人物简介" type="textarea" value={row.bio} onChange={bio => patch({bio})} />
    <AssetField label="朋友圈封面" value={row.cover} onChange={cover => patch({cover})} />
    <Toggle label="玩家初始好友" checked={row.initial} onChange={initial => patch({initial})} />
    <Toggle label="可通过账号搜索" checked={row.searchable} onChange={searchable => patch({searchable})} />
    <ConditionField label="加好友解锁条件" value={row.unlock} onChange={unlock => patch({unlock})} />
    <ActionField label="加好友后触发" value={row.onAdd} onChange={onAdd => patch({onAdd})} />
    <Fold title="所属群聊"><CheckList choices={choiceList(project.threads.filter(t => t.kind === 'group'),t => t.name)} selected={memberOf}
      onChange={selected => update(p => ({ ...p, threads: p.threads.map(t => {
        if (t.kind !== 'group') return t
        const existing = t.members.some(m => m.contact === row.id)
        if (selected.includes(t.id) === existing) return t
        return { ...t, members: existing ? t.members.filter(m => m.contact !== row.id) : [...t.members,{ contact:row.id,nickname:'' }] }
      }) }))} /></Fold>
    <Fold title="隐藏名片字段"><CheckList choices={options.map(([value,label]) => choice(value,label))} selected={row.hidden} onChange={hidden => patch({hidden})} /></Fold>
    <Fold title="自定义名片字段">
      {row.custom.map((field,i) => <div className="studio-block" key={i}>
        <TextField label="字段名称" value={field.label} onChange={label => patch({ custom:row.custom.map((f,n) => n === i ? { ...f,label } : f) })} />
        <TextField label="字段内容" value={field.value} onChange={value => patch({ custom:row.custom.map((f,n) => n === i ? { ...f,value } : f) })} />
        <Toggle label="隐藏此字段" checked={field.hidden} onChange={hidden => patch({ custom:row.custom.map((f,n) => n === i ? { ...f,hidden } : f) })} />
        <SmallButton remove onClick={() => patch({custom:row.custom.filter((_,n) => n !== i)})}>删除字段</SmallButton>
      </div>)}
      <SmallButton onClick={() => patch({ custom:[...row.custom,{ label:'新字段',value:'',hidden:false }] })}>添加字段</SmallButton>
    </Fold>
  </>
}

const messageKinds = [choice('text','普通文本'),choice('image','图片'),choice('system','系统提示'),choice('date','日期及时间分隔'),choice('link','网址卡片'),choice('file','文件卡片')]
function MessageFields({ row, thread, patch }: { row: Message; thread: Thread; patch: Patch<Message> }) {
  const { project } = useStudio()
  const senderOptions = [choice('self','玩家本人'),...peopleChoices(project,thread.members.map(m => m.contact))]
  return <>
    <ChoiceField label="消息类型" options={messageKinds} value={row.type} onChange={type => patch({type:type as Message['type']})} />
    {row.type !== 'system' && row.type !== 'date' && <ChoiceField label="发送者" options={senderOptions} value={row.sender} empty="选择发送者" onChange={sender => patch({sender})} />}
    <TextField label="日期及时间（显示文本）" value={row.time} onChange={time => patch({time})} />
    <TextField label="消息内容" value={row.text} type="textarea" onChange={text => patch({text})} />
    {row.type === 'link' && <ChoiceField label="游戏内网址" options={project.pages.filter(p => p.url).map(p => choice(p.url,p.title + ' · ' + p.url))}
      empty="选择已建立的页面" value={row.url} onChange={url => patch({url})} />}
    {(row.type === 'image' || row.type === 'file') && <AssetField label={row.type === 'image' ? '消息图片' : '消息文件'} imageOnly={row.type === 'image'}
      value={row.media} onChange={media => patch({media})} />}
    <ConditionField label="消息出现条件" value={row.when} onChange={when => patch({when})} />
    <ActionField label="消息点击行为" value={row.action} onChange={action => patch({action})} />
    <ActionField label="阅读时触发" value={row.onRead} onChange={onRead => patch({onRead})} />
  </>
}
export function ThreadFields({ row, patch, messageId, selectMessage }: {
  row: Thread; patch: Patch<Thread>; messageId: string; selectMessage: (id: string) => void
}) {
  const { project, update } = useStudio()
  const message = row.messages.find(m => m.id === messageId)
  const addMessage = (copy?: Message) => {
    const id = makeId()
    const next: Message = copy ? { ...structuredClone(copy), id } : {
      id, sender:row.members[0]?.contact || 'self',type:'text',text:'新消息',time:'',media:'',url:''
    }
    const position = copy ? row.messages.findIndex(m => m.id === copy.id) + 1 : row.messages.length
    patch({ messages:[...row.messages.slice(0,position),next,...row.messages.slice(position)] })
    selectMessage(id)
  }
  return <>
    {row.kind === 'group' ? <>
      <TextField label="群聊名称" value={row.name} onChange={name => patch({name})} />
      <AssetField label="群头像" value={row.avatar} onChange={avatar => patch({avatar})} />
      <TextField label="群公告" type="textarea" value={row.announcement} onChange={announcement => patch({announcement})} />
      <Fold title={`群成员 · ${row.members.length} 人`}>
        <CheckList choices={contactChoices(project)} selected={row.members.map(m => m.contact)} onChange={items =>
          patch({ members:items.map(contact => row.members.find(m => m.contact === contact) || {contact,nickname:''}) })} />
        {row.members.map(m => <TextField key={m.contact} label={(project.contacts.find(c => c.id === m.contact)?.name || m.contact) + '的群昵称'}
          value={m.nickname} onChange={nickname => patch({members:row.members.map(person => person.contact === m.contact ? { ...person,nickname } : person)})} />)}
      </Fold>
    </> : <ChoiceField label="聊天对象" empty="选择已有联系人" options={contactChoices(project)} value={row.members[0]?.contact || ''}
      onChange={contact => {
        const previous = row.members[0]?.contact
        patch({ members:contact ? [{contact,nickname:''}] : [], messages:row.messages.map(m => (previous && m.sender === previous) ? { ...m,sender:contact || 'self' } : m) })
      }} />}
    <ConditionField label="会话出现条件" value={row.when} onChange={when => patch({when})} />
    <section className="nested-editor">
      <div className="nested-title"><h3>聊天记录</h3><SmallButton onClick={() => addMessage()}>新增消息</SmallButton></div>
      <SortList label="聊天消息排序" rows={row.messages} selected={messageId} identify={m => m.id} setRows={messages => patch({messages})}
        render={(m,i) => <button className="sort-select" onClick={() => selectMessage(m.id)} aria-pressed={m.id === messageId}>
          <small>{i + 1} · {messageKinds.find(k => k.value === m.type)?.label} {m.time}</small><span>{m.text || '未填写消息内容'}</span>
        </button>} />
    </section>
    {message && <section className="nested-editor" key={message.id}>
      <div className="nested-title"><h3>消息属性</h3><button className="studio-small" onClick={() => addMessage(message)}><Copy size={13} />复制消息</button></div>
      <MessageFields row={message} thread={row} patch={fields => update(p => ({ ...p, threads:p.threads.map(t => t.id === row.id ?
        { ...t,messages:t.messages.map(m => m.id === message.id ? { ...m,...fields } : m) } : t) }))} />
      <SmallButton remove onClick={() => { patch({messages:row.messages.filter(m => m.id !== message.id)}); selectMessage('') }}>删除消息</SmallButton>
    </section>}
  </>
}
export function PostFields({ row, patch }: { row: Post; patch: Patch<Post> }) {
  const { project } = useStudio()
  const [image, setImage] = useState('')
  const images = project.assets.filter(a => a.mime.startsWith('image/'))
  return <>
    <ChoiceField label="发布者" empty="选择联系人" options={contactChoices(project)} value={row.author} onChange={author => patch({author})} />
    <TextField label="动态文字" type="textarea" value={row.text} onChange={text => patch({text})} />
    <TextField label="发布时间" value={row.time} onChange={time => patch({time})} />
    <TextField label="虚构地点" value={row.location} onChange={location => patch({location})} />
    <ChoiceField label="图片区布局" value={row.layout} options={[choice('grid','九宫格'),choice('strip','横向条带')]} onChange={layout => patch({layout:layout as Post['layout']})} />
    <Fold title={`动态图片 · ${row.images.length} / 9`}>
      <SortList rows={row.images} identify={(id,i) => id + i} setRows={images => patch({images})} label="动态图片排序" render={(id,i) => <div className="image-sort">
        {images.find(a => a.id === id) ? <img src={images.find(a => a.id === id)?.data} alt={images.find(a => a.id === id)?.name} /> : <small>素材缺失</small>}
        <SmallButton remove onClick={() => patch({images:row.images.filter((_,n) => n !== i)})}>移除</SmallButton>
      </div>} />
      {row.images.length < 9 && <>
        <AssetField label="动态图片" value={image} onChange={id => setImage(id)} />
        <SmallButton disabled={!image} onClick={() => { patch({images:[...row.images,image]}); setImage('') }}>加入动态</SmallButton>
      </>}
    </Fold>
    <Fold title={`虚构点赞 · ${row.likes.length}`}><CheckList choices={contactChoices(project)} selected={row.likes} onChange={likes => patch({likes})} /></Fold>
    <Fold title={`虚构评论及回复 · ${row.comments.length}`}>
      {row.comments.map((c,i) => {
        const edit = (change: Partial<typeof c>) => patch({comments:row.comments.map(item => item.id === c.id ? { ...item,...change } : item)})
        return <div key={c.id} className="studio-block">
          <ChoiceField label="评论发送者" empty="选择联系人" options={contactChoices(project)} value={c.sender} onChange={sender => edit({sender})} />
          <ChoiceField label="回复哪条评论" empty="独立评论" options={choiceList(row.comments.slice(0,i), item => item.text || '空评论')} value={c.replyTo} onChange={replyTo => edit({replyTo})} />
          <TextField label="评论文字" value={c.text} onChange={text => edit({text})} />
          <SmallButton remove onClick={() => patch({comments:row.comments.filter(item => item.id !== c.id).map(item => item.replyTo === c.id ? { ...item,replyTo:'' } : item)})}>删除评论</SmallButton>
        </div>
      })}
      <SmallButton onClick={() => patch({comments:[...row.comments,{ id:makeId(),sender:'',text:'',replyTo:'' }]})}>添加评论</SmallButton>
    </Fold>
    <ConditionField label="动态可见条件" value={row.when} onChange={when => patch({when})} />
    <ActionField label="文字点击行为" value={row.action} onChange={action => patch({action})} />
    <ActionField label="图片点击行为" value={row.imageAction} onChange={imageAction => patch({imageAction})} />
    <ChoiceField label="点击收集隐藏线索" empty="不记录线索" options={choiceList(project.clues,a => a.name)} value={row.hiddenClue} onChange={hiddenClue => patch({hiddenClue})} />
  </>
}
