import sharp from 'sharp'

const width = 1280
const height = 720

const esc = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

function node(x, y, label, color, active = false, size = 7) {
  const halo = active ? `<circle cx="${x}" cy="${y}" r="${size + 15}" fill="${color}" opacity=".12"/><circle cx="${x}" cy="${y}" r="${size + 9}" fill="none" stroke="${color}" stroke-width="1.5" opacity=".75"/>` : ''
  return `${halo}<circle cx="${x}" cy="${y}" r="${active ? size + 3 : size}" fill="${color}"/><text x="${x}" y="${y + 24}" text-anchor="middle" class="node-label">${esc(label)}</text>`
}

function card(y, title, source, tags, active) {
  return `<rect x="1025" y="${y}" width="225" height="${active ? 130 : 110}" rx="10" fill="#151620" stroke="${active ? '#8b7aff' : '#303144'}" stroke-width="${active ? 1.5 : 1}"/>
    <text x="1043" y="${y + 27}" class="card-title">⌘  ${esc(title)}</text>
    <text x="1043" y="${y + 48}" class="muted">${esc(source)}</text>
    <text x="1043" y="${y + 72}" class="card-copy">Related public skill from GitHub</text>
    ${tags.map((tag, index) => `<rect x="${1043 + index * 58}" y="${y + 84}" width="${tag.length * 7 + 16}" height="20" rx="5" fill="#20352f" stroke="#395d51"/><text x="${1051 + index * 58}" y="${y + 98}" class="tag">${esc(tag)}</text>`).join('')}`
}

function frame(stage) {
  const category = stage === 1
  const selected = stage === 2
  const designColor = '#9385ff'
  const graphScale = category ? 1.11 : selected ? 1.18 : 1
  const graphX = category ? -40 : selected ? -70 : 0
  const activeText = selected ? 'ui-ux-pro-max' : category ? '设计与创意' : '全部技能'
  const graphNodes = [
    [555, 324, 'ui-ux-pro-max', designColor, selected], [615, 302, 'design-system', designColor, false],
    [656, 352, 'ui-styling', designColor, false], [575, 393, 'imagegen', designColor, false],
    [490, 367, 'audit', designColor, false], [695, 410, 'frontend', designColor, false],
    [425, 250, 'documents', '#ffb76a', false], [370, 300, 'slides', '#ffb76a', false],
    [445, 430, 'research', '#62d3b2', false], [360, 465, 'notion', '#62d3b2', false],
    [755, 455, 'web apps', '#67a8ff', false], [810, 505, 'workflows', '#67a8ff', false]
  ]
  const lines = [[520,355,615,302],[520,355,656,352],[520,355,575,393],[520,355,490,367],[520,355,425,250],[520,355,445,430],[520,355,755,455],[555,324,615,302],[555,324,656,352],[555,324,575,393]]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: #f2f1fa; }
    .eyebrow { font-size: 10px; letter-spacing: 2px; fill: #a7a4bd; font-weight: 700; }
    .brand { font-size: 21px; font-weight: 700; letter-spacing: -1px; }
    .title { font-size: 30px; font-weight: 750; letter-spacing: -1px; }
    .subtitle { font-size: 14px; fill: #a7a4bd; }
    .side { font-size: 13px; fill: #e7e5f2; font-weight: 560; }
    .small { font-size: 11px; fill: #9692aa; }
    .node-label { font-size: 10px; fill: #d8d5e7; font-weight: 550; }
    .card-title { font-size: 13px; font-weight: 700; }
    .card-copy { font-size: 10px; fill: #b9b6ca; }
    .muted { font-size: 10px; fill: #89859e; }
    .tag { font-size: 9px; fill: #b5e6d1; font-weight: 600; }
  </style>
  <rect width="1280" height="720" fill="#101117"/>
  <rect x="0" y="0" width="1280" height="54" fill="#15161e"/>
  <path d="M0 54H1280" stroke="#343542"/>
  <rect x="18" y="14" width="28" height="28" rx="8" fill="#9485ff"/><text x="25" y="35" font-size="17">♧</text>
  <text x="55" y="34" class="brand">skills brain</text><rect x="171" y="20" width="49" height="17" rx="4" fill="#242433"/><text x="181" y="32" class="eyebrow" style="font-size:8px">LOCAL</text>
  <text x="892" y="33" class="small">●  本地已连接</text><rect x="1010" y="14" width="105" height="28" rx="7" fill="#232430" stroke="#4a4a5c"/><text x="1032" y="33" class="side">↻ 同步技能</text>
  <rect x="0" y="54" width="225" height="666" fill="#14151d"/><path d="M225 54V720" stroke="#343542"/>
  <text x="20" y="88" class="eyebrow">WORKSPACE     01</text><text x="20" y="123" class="side">✣  我的技能宇宙</text>
  <rect x="17" y="146" width="190" height="36" rx="7" fill="#191a24" stroke="#30313d"/><text x="30" y="169" class="small">⌕  搜索技能...</text>
  <text x="17" y="217" class="small">技能领域     6</text>
  ${[['▱  全部技能','59','#a6a0bc'],['✾  设计与创意','16',designColor],['⌘  开发与构建','5','#67a8ff'],['▤  文档与表达','8','#ffb76a'],['◫  知识与研究','6','#62d3b2'],['◉  数据与分析','5','#ee82b7'],['⌁  工具与工作流','19','#d6d764']].map(([name,count,color], i) => {
      const active = (category && i === 1) || (!category && !selected && i === 0)
      const y = 238 + i * 39
      return `${active ? `<rect x="12" y="${y - 23}" width="198" height="32" rx="6" fill="#292741"/>` : ''}<text x="27" y="${y}" class="side" fill="${color}">${name}</text><text x="189" y="${y}" class="small">${count}</text>`
    }).join('')}
  <text x="17" y="548" class="small">本地技能   59</text>
  ${['ui-ux-pro-max','ui-styling','imagegen','design-system','audit'].map((name, i) => `<text x="28" y="${578+i*28}" class="small" fill="${selected && i === 0 ? '#b8afff' : '#a7a4bd'}">◇  ${name}</text>`).join('')}
  <text x="17" y="692" class="small">▣  本地技能库</text><text x="17" y="708" class="small">3 个目录 · 只读连接</text>
  <g transform="translate(${graphX} 0) scale(${graphScale} 1)">
    <text x="260" y="92" class="eyebrow">YOUR KNOWLEDGE, CONNECTED</text><text x="260" y="128" class="title">技能大脑</text><text x="380" y="128" class="subtitle">Skills Brain</text>
    <text x="260" y="153" class="subtitle">让独立的技能，连接成完整的能力。</text>
    <text x="260" y="204" class="title" style="font-size:22px">59</text><text x="298" y="204" class="small">本地技能</text><path d="M370 182V210" stroke="#363743"/><text x="388" y="204" class="title" style="font-size:22px">06</text><text x="424" y="204" class="small">能力领域</text><path d="M500 182V210" stroke="#363743"/><text x="518" y="204" class="title" style="font-size:22px">29</text><text x="554" y="204" class="small">网络技能 ●</text>
    <rect x="260" y="235" width="148" height="32" rx="7" fill="#20212c"/><rect x="263" y="238" width="72" height="26" rx="5" fill="#39384b" stroke="#706a8d"/><text x="281" y="257" class="side">⌘ 脑图</text><text x="349" y="257" class="small">▱ 列表</text>
    <text x="775" y="257" class="small">网络关联</text><rect x="852" y="242" width="35" height="18" rx="10" fill="#8c7cff"/><circle cx="876" cy="251" r="7" fill="#fff"/><text x="900" y="257" class="small">${esc(activeText)}</text>
    <path d="M260 286H970" stroke="#343542"/><text x="260" y="312" class="eyebrow" style="fill:#7fd6b8">● LIVE GRAPH</text><text x="366" y="312" class="small">59 个可见节点</text>
    ${category ? '<ellipse cx="555" cy="352" rx="185" ry="136" fill="#9385ff" opacity=".045" stroke="#9385ff" stroke-width="1.5"/>' : ''}
    ${lines.map(([x1,y1,x2,y2]) => `<path d="M${x1} ${y1} Q${(x1+x2)/2} ${(y1+y2)/2-25} ${x2} ${y2}" fill="none" stroke="#555068" stroke-width="1" opacity=".72"/>`).join('')}
    <circle cx="520" cy="355" r="38" fill="#1d1d2a" stroke="#57516f"/><circle cx="520" cy="355" r="29" fill="#27253a"/><text x="520" y="352" text-anchor="middle" class="eyebrow" style="font-size:10px;fill:#f4f2ff">SKILLS</text><text x="520" y="368" text-anchor="middle" class="small" style="font-size:9px">我的能力网络</text>
    ${graphNodes.map(([x,y,label,color,active]) => node(x,y,label,color,active)).join('')}
    ${category ? '<text x="555" y="474" text-anchor="middle" class="subtitle" style="fill:#b8afff">设计与创意 · 16 个技能已聚焦</text>' : ''}
    ${selected ? '<path d="M555 324 L947 252" stroke="#9385ff" stroke-width="1.5" stroke-dasharray="5 5"/><circle cx="947" cy="252" r="6" fill="#9385ff"/>' : ''}
  </g>
  <path d="M990 54V720" stroke="#343542"/><rect x="990" y="54" width="290" height="666" fill="#14151d"/>
  <text x="1018" y="101" class="side" style="font-size:16px">♧  技能详情</text><rect x="1018" y="121" width="68" height="22" rx="5" fill="#292741" stroke="#655aa5"/><text x="1028" y="136" class="small" style="fill:#b9afff">设计与创意</text><text x="1095" y="136" class="small">个人技能</text>
  <text x="1018" y="178" class="title" style="font-size:22px">${selected ? 'ui-ux-pro-max' : category ? '设计与创意' : 'Skills Brain'}</text><rect x="1211" y="153" width="36" height="36" rx="8" fill="#232432" stroke="#5a5970"/><text x="1222" y="177" class="side">▤</text>
  <text x="1018" y="210" class="subtitle" style="font-size:12px">${selected ? 'UI/UX design intelligence for web, mobile, and desktop.' : 'Explore local skills and connected public capabilities.'}</text>
  <path d="M1018 232H1252" stroke="#343542"/><text x="1018" y="263" class="side">◉  关联发现</text><text x="1146" y="263" class="small">${selected ? '10' : category ? '16' : '29'}</text><text x="1226" y="263" class="small">↻</text>
  <rect x="1018" y="280" width="234" height="34" rx="7" fill="#191a24" stroke="#30313d"/><text x="1031" y="302" class="small">⌕  搜索名称、用途或关键词...</text>
  <text x="1018" y="345" class="side">◎  网络相似技能</text><text x="1219" y="345" class="small">6</text>
  ${card(362, selected ? 'web-design-guidelines' : 'frontend-design', 'vercel-labs/agent-skills', ['design','accessibility','guides'], selected)}
  ${card(505, 'brand-guidelines', 'anthropics/skills', ['design','typography','style'], false)}
  <text x="1018" y="672" class="small">已连接 · 29 个网络技能</text><text x="1018" y="695" class="small">共同关键词说明关联依据。</text>
  <rect x="0" y="703" width="1280" height="17" fill="#12131a"/><text x="17" y="715" class="eyebrow" style="font-size:8px">● LOCAL FIRST · CONNECTED THINKING</text>
  </svg>`
}

const stages = [0, 0, 1, 1, 2, 2, 1, 0]
const frames = stages.map((stage) => Buffer.from(frame(stage)))
await sharp(frames, { join: { animated: true } })
  .gif({ loop: 0, delay: stages.map(() => 1050), effort: 8, dither: 0.7 })
  .toFile('docs/assets/skills-brain-demo.gif')

console.log('Created docs/assets/skills-brain-demo.gif')
