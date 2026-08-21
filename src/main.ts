// 主入口
import './style.css'
import { startBackground } from './bg-canvas'
import { analyze, timeBasedTheme } from './analytics'
import type { Snapshot, SnapshotManifest } from './types'
import { makeCard } from './components/card'
import { renderCoverWall } from './components/cover-wall'
import { renderArtistTags } from './components/tag-cloud'
import { renderPalette } from './components/palette-bar'
import { renderTodaysPick } from './components/todays-pick'
import {
  renderDecadeChart,
  renderDurationChart,
  renderPopularityHistogram,
  renderYearLine,
  renderArtistCloud,
} from './viz/svg'

const base = import.meta.env.BASE_URL

// ---- 状态 ----
let current: Snapshot | null = null
let manifest: SnapshotManifest | null = null

// ---- 工具 ----
async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-cache' })
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`)
  return r.json()
}

function pickPlaylistId(): string | null {
  const u = new URL(location.href)
  const id = u.searchParams.get('id')
  if (id && /^\d+$/.test(id)) return id
  return null
}

// 加载指定 id 的歌单数据；为 null 则加载默认 latest.json
async function loadSnapshot(id: string | null): Promise<Snapshot> {
  // 热插拔：URL ?id=xxx → 尝试 /data/external/<id>.json；否则读 latest.json
  if (id) {
    try {
      const r = await fetchJSON<Snapshot>(`${base}data/external/${id}.json`)
      return r
    } catch (e) {
      console.warn('external snapshot not found, fallback to default', e)
    }
  }
  return fetchJSON<Snapshot>(`${base}data/latest.json`)
}

// ---- 渲染 ----
function setHero(s: Snapshot) {
  const pl = s.playlist
  ;(document.getElementById('playlist-name') as HTMLElement).textContent = pl.name
  ;(document.getElementById('creator') as HTMLElement).textContent =
    pl.creator ? `by ${pl.creator}` : '佚名'
  ;(document.getElementById('track-count') as HTMLElement).textContent =
    String(pl.trackCount || s.tracks.length)
  ;(document.getElementById('snapshot-date') as HTMLElement).textContent = s.snapshotDate
  const desc = document.getElementById('playlist-desc') as HTMLElement
  desc.textContent = pl.description
    ? pl.description
    : `共 ${s.tracks.length} 首歌，建立于 ${fmtDate(pl.createTime)}，更新于 ${fmtDate(pl.updateTime)}。`
}

function fmtDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts).toISOString().slice(0, 10)
}

function renderReport(s: Snapshot) {
  const a = analyze(s)
  const host = document.getElementById('report')!
  host.innerHTML = ''

  // 主报告
  const main = document.createElement('div')
  main.className = 'report-card'
  main.innerHTML = `
    <div class="label">音乐人格 · MUSIC PERSONALITY</div>
    <p class="quote">${md(a.personality.headline)}</p>
    <p class="quote" style="font-size:18px; opacity:0.85; margin-top:14px">${md(a.personality.quote)}</p>
    <div class="meta">${escapeHtml(a.personality.meta)}</div>
  `
  host.appendChild(main)

  // 数字统计卡
  const stats = document.createElement('div')
  stats.className = 'report-card'
  stats.style.display = 'grid'
  stats.style.gridTemplateColumns = 'repeat(4, 1fr)'
  stats.style.gap = '20px'
  stats.innerHTML = `
    ${statBox('总曲目', String(a.total))}
    ${statBox('跨度', a.yearSpan.min ? `${a.yearSpan.max - a.yearSpan.min} 年` : '—')}
    ${statBox('最爱艺人', a.topArtist?.name || '—', a.topArtist?.count + ' 首')}
    ${statBox('平均时长', fmtDuration(a.meanDurationSec))}
  `
  host.appendChild(stats)
}

function statBox(label: string, value: string, sub?: string): string {
  return `
    <div>
      <div style="font-family:var(--mono); font-size:11px; color:var(--muted); letter-spacing:0.18em; text-transform:uppercase">${escapeHtml(label)}</div>
      <div style="font-family:var(--serif); font-size:32px; margin-top:6px">${escapeHtml(value)}</div>
      ${sub ? `<div style="font-family:var(--mono); font-size:11px; color:var(--accent); margin-top:2px">${escapeHtml(sub)}</div>` : ''}
    </div>
  `
}

function fmtDuration(sec: number): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function renderSections(s: Snapshot) {
  const a = analyze(s)
  const host = document.getElementById('sections')!
  host.innerHTML = ''

  // 今日一抽
  const pick = makeCard({ title: '🎲 今日一抽', sub: '随机一首歌，配一句应景的话' })
  pick.el.classList.add('span-4')
  renderTodaysPick(pick.body, s.tracks)
  host.appendChild(pick.el)

  // 调色板
  const pal = makeCard({ title: '🎨 封面色谱', sub: '从最热门的 12 张封面里提取的主色' })
  pal.el.classList.add('span-8')
  renderPalette(pal.body, s.tracks)
  host.appendChild(pal.el)

  // 十年分布
  const dec = makeCard({ title: '年代的偏爱', sub: `你最常回到的十年 · ${a.dominantDecade?.decade || '—'}` })
  dec.el.classList.add('span-6')
  host.appendChild(dec.el)
  const decSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  decSvg.classList.add('viz')
  dec.body.appendChild(decSvg)
  renderDecadeChart(decSvg as unknown as SVGSVGElement, a.decade)

  // 时长分布
  const dur = makeCard({ title: '耐心曲线', sub: `平均时长 ${fmtDuration(a.meanDurationSec)}` })
  dur.el.classList.add('span-6')
  host.appendChild(dur.el)
  const durSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  durSvg.classList.add('viz')
  dur.body.appendChild(durSvg)
  renderDurationChart(durSvg as unknown as SVGSVGElement, a.duration)

  // 热度分布
  const pop = makeCard({ title: '热度光谱', sub: '每首歌的网易云人气分（0-100）' })
  pop.el.classList.add('span-6')
  host.appendChild(pop.el)
  const popSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  popSvg.classList.add('viz')
  pop.body.appendChild(popSvg)
  renderPopularityHistogram(popSvg as unknown as SVGSVGElement, s.tracks.map(t => t.popularity))

  // 艺人云
  const art = makeCard({ title: '声音的常客', sub: '艺人出现次数 · 字号 = 次数' })
  art.el.classList.add('span-6')
  host.appendChild(art.el)
  const artSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  artSvg.classList.add('viz')
  art.body.appendChild(artSvg)
  renderArtistCloud(artSvg as unknown as SVGSVGElement, a.artistsTop)

  // 年代线
  const yl = makeCard({ title: '年份脉络', sub: '每年新增的歌曲数量' })
  yl.el.classList.add('span-12')
  host.appendChild(yl.el)
  const ylSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  ylSvg.classList.add('viz')
  yl.body.appendChild(ylSvg)
  renderYearLine(ylSvg as unknown as SVGSVGElement, a.year)

  // 标签墙
  const tags = makeCard({ title: '最常听到的艺人', sub: '按出现次数排序' })
  tags.el.classList.add('span-12')
  host.appendChild(tags.el)
  renderArtistTags(tags.body, a.artistsTop, 30)

  // 经典珍藏
  if (a.classics.length) {
    const c = makeCard({ title: '热门猎人', sub: `你收藏的 ${a.classics.length} 首国民级单曲` })
    c.el.classList.add('span-6')
    host.appendChild(c.el)
    renderCoverWall(c.body, a.classics, 18)
  }

  // 冷门考古
  if (a.hidden.length) {
    const h = makeCard({ title: '小众考古', sub: `你珍视的 ${a.hidden.length} 首冷门珍宝` })
    h.el.classList.add('span-6')
    host.appendChild(h.el)
    renderCoverWall(h.body, a.hidden, 18)
  }

  // 全封面墙
  const all = makeCard({ title: '你的 170 张封面', sub: '整张歌单的视觉印象' })
  all.el.classList.add('span-12')
  host.appendChild(all.el)
  renderCoverWall(all.body, s.tracks, 80)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!
  ))
}

// 迷你 markdown：把 *xxx* 渲染为 <strong>（用于报告文案）
function md(s: string): string {
  return escapeHtml(s).replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
}

// ---- 时光机 ----
async function openSnapshotDialog() {
  if (!manifest) {
    try {
      manifest = await fetchJSON<SnapshotManifest>(`${base}data/manifest.json`)
    } catch {
      alert('没有发现历史快照（manifest.json 不可达）。')
      return
    }
  }
  const dlg = document.getElementById('snapshot-dialog') as HTMLDialogElement
  const ul = document.getElementById('snapshot-list')!
  ul.innerHTML = ''
  manifest.snapshots.forEach(s => {
    const li = document.createElement('li')
    li.innerHTML = `<span>${s.date}</span><span class="dim">${s.trackCount} 首</span>`
    li.onclick = async () => {
      try {
        const snap = await fetchJSON<Snapshot>(`${base}data/snapshots/${s.date}.json`)
        current = snap
        renderAll()
        dlg.close()
      } catch (e) {
        alert('加载快照失败：' + e)
      }
    }
    ul.appendChild(li)
  })
  dlg.showModal()
}

// ---- 热插拔 ----
function openSwapDialog() {
  const dlg = document.getElementById('swap-dialog') as HTMLDialogElement
  const input = document.getElementById('swap-input') as HTMLInputElement
  const form = document.getElementById('swap-form') as HTMLFormElement
  input.value = new URL(location.href).searchParams.get('id') || ''
  form.onsubmit = (e) => {
    e.preventDefault()
    const id = input.value.trim()
    if (!/^\d+$/.test(id)) {
      alert('请输入有效的歌单 ID（纯数字）')
      return
    }
    const u = new URL(location.href)
    u.searchParams.set('id', id)
    location.href = u.toString()
  }
  dlg.showModal()
}

function renderAll() {
  if (!current) return
  setHero(current)
  renderReport(current)
  renderSections(current)
}

// ---- 入口 ----
async function main() {
  // 主题
  document.documentElement.dataset.theme = timeBasedTheme()

  // 背景粒子
  startBackground()

  // 顶部按钮
  document.getElementById('snapshot-btn')!.onclick = openSnapshotDialog
  document.getElementById('swap-btn')!.onclick = openSwapDialog

  // 数据
  const id = pickPlaylistId()
  try {
    current = await loadSnapshot(id)
  } catch (e) {
    document.getElementById('app-root')!.innerHTML = `
      <div class="hero">
        <h1>—</h1>
        <p class="hero-desc">没找到数据。请先运行 <code>python3 scripts/fetch_playlist.py</code>，并把 <code>data/latest.json</code> 部署到当前站点。</p>
      </div>
    `
    console.error(e)
    return
  }
  renderAll()

  // 监听对话框 close 时的 ESC 行为
  for (const id of ['snapshot-dialog', 'swap-dialog']) {
    const d = document.getElementById(id) as HTMLDialogElement
    d.addEventListener('click', e => {
      if (e.target === d) d.close()
    })
  }
}

main()