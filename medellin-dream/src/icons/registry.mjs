export const iconDefaults = {
  plate: '#E4E8EE',
  border: '#CBD2DC',
  accent: '#B8C8DC',
  fill: '#8499BA',
  stroke: '#738AA9',
  size: 43,
  radius: 13,
  opacity: 100,
  scale: 100
}

export const iconRanges = {
  size: [28, 54],
  radius: [0, 32],
  opacity: [0, 100],
  scale: [60, 125]
}

const path = (d, props = {}) => ['path', { d, ...props }]
const rect = (x, y, width, height, rx = 0, props = {}) => ['rect', { x,y,width,height,rx,...props }]
const circle = (cx, cy, r, props = {}) => ['circle', { cx,cy,r,...props }]
const ellipse = (cx, cy, rx, ry) => ['ellipse', { cx,cy,rx,ry }]
const outline = { fill: 'none', stroke: 'var(--icon-stroke)' }
const detail = { fill: 'none', stroke: 'var(--icon-plate)' }
const inset = { fill: 'var(--icon-accent)' }
const light = { fill: 'var(--icon-plate)' }

export const iconRegistry = {
  files: { name:'文件管理', shapes:[
    path('M12.5 21h16l5 5h18v21h-39z'),
    path('M12.5 27h39', { stroke:'var(--icon-accent)' })
  ] },
  chat: { name:'聊天软件', shapes:[
    path('M14 16h36v26H33l-12 8v-8h-7z'),
    path('M22 26h20m-20 7h15', detail)
  ] },
  browser: { name:'浏览器', shapes:[
    circle(32,32,18.25,outline),
    ['ellipse',{cx:32,cy:32,rx:8.25,ry:18.25,...outline}],
    path('M16.6 22.5h30.8M14 32h36M16.6 41.5h30.8',{...outline,strokeWidth:1.8})
  ] },
  contacts: { name:'通讯录', shapes:[
    rect(16,12.5,34,39,4),
    path('M12.5 21h6m-6 11h6m-6 11h6',outline),
    circle(33,26,6,light),
    path('M22 42q11-13.5 22 0z', light)
  ] },
  notes: { name:'备忘录', shapes:[
    rect(16,12.5,32,39,3,{ ...outline,fill:'var(--icon-inset)' }),
    path('M23.5 23.5h17m-17 7.3h17m-17 7.3H36',{...outline,strokeWidth:2})
  ] },
  trash: { name:'回收站', shapes:[
    path('M15 18.5h34m-23-5h12',outline),
    path('M18.5 23.5h27l-3.7 27H22.2z',{ ...inset,stroke:'var(--icon-stroke)' }),
    path('M28.3 29.5v13.8m7.4-13.8v13.8',outline)
  ] },
  photos: { name:'相册', shapes:[
    path('m13.5 44.5 12.5-16 11 11 6-6 7.5 9.5v1.5z'),
    circle(39.5,24.5,3.7),
    rect(12.5,15,39,34,4,outline)
  ] },
  settings: { name:'系统设置', shapes:[
    path('M27 12.5h10l2.4 7.4 7.3 1.1 4.8 8.5-5.1 6.1.4 7.8-8.4 5-6.4-4.8-8.3 4.8-7-6.1.9-7.5-5-5.5 4.8-8.3 7.1-1.1z M40.5 31a8.5 8.5 0 1 0-17 0 8.5 8.5 0 1 0 17 0z',{fillRule:'evenodd'})
  ] },
  mail: { name:'电子邮件', shapes:[
    rect(11.5,18.5,41,29,4,{ ...inset,stroke:'var(--icon-stroke)' }),
    path('m13 21 19 14.7L51 21',outline)
  ] },
  calendar: { name:'日历', shapes:[
    rect(15,16,34,35,4,{ ...outline,fill:'var(--icon-inset)' }),
    path('M23.5 12.5v8.7m17-8.7v8.7M15 26h34',outline),
    path('M24.5 33.5c1-3.2 7.1-3.4 7.1.5 0 2.6-3.7 4.7-6.9 8h7.2m3-10.2h7L37.1 42',{...outline,strokeWidth:2.25})
  ] },
  music: { name:'音乐', shapes:[
    path('M27 41V18.5L46.5 13.5v24m-19.5-13.2 19.5-4.9',outline),
    ellipse(20,43,8.4,6),
    ellipse(39.5,38,8.4,6)
  ] },
  terminal: { name:'终端', shapes:[
    rect(11.5,15,41,35,5),
    path('m20 26 8 7.2-8 7.3m13.5 0h11.3',detail)
  ] },
  computer: { name:'此电脑', shapes:[
    rect(12.5,15.5,39,27,3,{ ...inset,stroke:'var(--icon-stroke)' }),
    path('M13 36.5h38m-19 6.5v5.5m-8 0h16',outline)
  ] }
}

export const builtinIcons = Object.keys(iconRegistry)
export const iconAssetMimes = ['image/svg+xml','image/png','image/webp']
