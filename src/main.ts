import './style.css'
import { startBackground } from './bg-canvas'
import { analyze, timeBasedTheme } from './analytics'
import type { Analytics } from './analytics'
import type { Snapshot, SnapshotManifest, Track } from './types'
import { makeCard } from './components/card'
import { renderCoverWall } from './components/cover-wall'
import { renderArtistTags } from './components/tag-cloud'
import { renderPalette } from './components/palette-bar'
import { renderTodaysPick } from './components/todays-pick'
import { dominantColor } from './viz/palette'
import { renderDecadeChart, renderDurationChart, renderPopularityHistogram, renderYearLine, renderArtistCloud } from './viz/svg'

const base = import.meta.env.BASE_URL
let current: Snapshot | null = null
let manifest: SnapshotManifest | null = null
let toastTimer = 0

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`fetch ${url} → ${response.status}`)
  return response.json() as Promise<T>
}

function playlistIdFromUrl(): string | null {
  const id = new URL(location.href).searchParams.get('id')
  return id && /^\d+$/.test(id) ? id : null
}

async function loadSnapshot(id: string | null): Promise<Snapshot> {
  if (id) return fetchJSON<Snapshot>(`${base}data/external/${id}.json`)
  return fetchJSON<Snapshot>(`${base}data/latest.json`)
}

function imageUrl(url: string): string {
  return (url || '').replace(/^http:/, 'https:')
}

function fmtDate(ts: number): string {
  return ts ? new Date(ts).toISOString().slice(0, 10) : '—'
}

function fmtDuration(sec: number): string {
  if (!sec) return '—'
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch))
}

function md(s: string): string {
  return escapeHtml(s).replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
}

function showToast(message: string) {
  const toast = document.getElementById('toast')!
  toast.textContent = message
  toast.classList.add('is-visible')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800)
}

function setTheme(s: Snapshot) {
  document.documentElement.dataset.theme = timeBasedTheme()
  const cover = imageUrl(s.playlist.coverImgUrl || s.playlist.cover)
  if (cover) dominantColor(cover).then(color => document.documentElement.style.setProperty('--accent', color))
}

function setHero(s: Snapshot, a: Analytics) {
  const pl = s.playlist
  const trackCount = pl.trackCount || s.tracks.length
  const cover = imageUrl(pl.coverImgUrl || pl.cover)
  document.getElementById('playlist-name')!.textContent = pl.name || '未命名歌单'
  document.getElementById('creator')!.textContent = pl.creator ? `by ${pl.creator}` : '匿名收藏者'
  document.getElementById('playlist-cover')!.setAttribute('src', cover)
  document.getElementById('playlist-cover')!.setAttribute('alt', `${pl.name} 封面`)
  document.getElementById('playlist-desc')!.textContent = pl.description || `从 ${fmtDate(pl.createTime)} 开始，这份歌单用 ${trackCount} 首歌记录了一个人的迁徙、停留与重新出发。`
  document.getElementById('snapshot-date')!.textContent = s.snapshotDate || '最新快照'
  document.getElementById('hero-track-count')!.textContent = String(trackCount)
  document.getElementById('archive-index')!.textContent = String(Math.max(1, a.yearSpan.max - a.yearSpan.min + 1)).padStart(2, '0')
  document.getElementById('hero-footnote-text')!.textContent = `${a.psychology.archetype} · 基于 ${s.snapshotDate || '最新'} 快照`

  const meta = document.getElementById('hero-meta')!
  meta.innerHTML = ''
  const items = [
    `${trackCount} 首收藏`,
    `${a.yearSpan.min || '—'} — ${a.yearSpan.max || '—'}`,
    `平均 ${fmtDuration(a.meanDurationSec)}`,
    `播放 ${Number(pl.playCount || 0).toLocaleString('zh-CN')}`,
  ]
  items.forEach(item => { const span = document.createElement('span'); span.textContent = item; meta.appendChild(span) })
}

function meter(value: number): string {
  const filled = Math.round(value / 10)
  return `<div class="meter" aria-label="${value} 分"><i class="${filled >= 1 ? 'on' : ''}"></i><i class="${filled >= 2 ? 'on' : ''}"></i><i class="${filled >= 3 ? 'on' : ''}"></i><i class="${filled >= 4 ? 'on' : ''}"></i><i class="${filled >= 5 ? 'on' : ''}"></i><i class="${filled >= 6 ? 'on' : ''}"></i><i class="${filled >= 7 ? 'on' : ''}"></i><i class="${filled >= 8 ? 'on' : ''}"></i><i class="${filled >= 9 ? 'on' : ''}"></i><i class="${filled >= 10 ? 'on' : ''}"></i></div>`
}

function renderReport(s: Snapshot, a: Analytics) {
  const host = document.getElementById('report')!
  const p = a.psychology
  host.innerHTML = `
    <article class="report-card report-card-main">
      <div><div class="label">MUSIC PERSONALITY / 主叙事</div><p class="headline">${md(a.personality.headline)}</p><p class="body-copy">${md(a.personality.quote)}</p></div>
      <div class="meta">${escapeHtml(a.personality.meta)} · 音乐心理画像（非临床诊断）</div>
    </article>
    <article class="report-card report-card-small"><div class="label">EMOTIONAL WEATHER</div><div class="report-title">${escapeHtml(p.emotionalTone)}</div><p class="body-copy">${escapeHtml(p.emotionalSummary)}</p>${meter(p.moodScore)}</article>
    <article class="report-card report-card-small"><div class="label">LIFE RHYTHM</div><div class="report-title">${escapeHtml(p.rhythm)}</div><p class="body-copy">${escapeHtml(p.rhythmSummary)}</p>${meter(p.energyScore)}</article>
    <article class="report-card report-card-small"><div class="label">MEMORY & CURIOSITY</div><div class="report-title">${escapeHtml(p.memory)}<br /><span style="color:var(--accent)">${escapeHtml(p.curiosity)}</span></div><p class="body-copy">${escapeHtml(p.memorySummary)}</p>${meter(p.nostalgiaScore)}</article>
    <div class="report-facts">
      <div class="fact"><div class="stat-label">COLLECTION</div><strong>${a.total}</strong><em>首曲目</em></div>
      <div class="fact"><div class="stat-label">FAVOURITE VOICE</div><strong>${escapeHtml(a.topArtist?.name || '—')}</strong><em>${a.topArtist?.count || 0} 次出现</em></div>
      <div class="fact"><div class="stat-label">MEAN POPULARITY</div><strong>${Math.round(a.meanPopularity)}</strong><em>/ 100</em></div>
      <div class="fact"><div class="stat-label">DISCOVERY INDEX</div><strong>${p.discoveryScore}</strong><em>/ 100</em></div>
    </div>
  `
}

function renderTimeline(a: Analytics) {
  const host = document.getElementById('timeline-story')!
  const dominant = a.dominantDecade
  const oldest = a.year[0]
  const newest = a.year[a.year.length - 1]
  host.innerHTML = `
    <div><div class="story-year">${a.yearSpan.min || '—'} — ${a.yearSpan.max || '—'} / ${a.yearSpan.max - a.yearSpan.min || 0} YEARS</div><h3>${dominant ? `你总会回到<br /><i>${dominant.decade}</i>。` : '时间还在<br /><i>生成中。</i>'}</h3><p>${dominant ? `这一段年代贡献了 ${dominant.count} 首歌，它不是怀旧，而是你与某种声音建立过的长期关系。` : '当更多快照被保存，时间会慢慢显出它的纹理。'}</p></div>
    <div class="story-foot"><span>最早发行<br /><strong>${oldest?.year || '—'}</strong></span><span>最近发行<br /><strong>${newest?.year || '—'}</strong></span></div>
    <div id="snapshot-delta" class="snapshot-delta"></div>
  `
  const chartHost = document.getElementById('timeline-chart')!
  chartHost.innerHTML = ''
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('viz')
  chartHost.appendChild(svg)
  renderYearLine(svg as unknown as SVGSVGElement, a.year)
}

async function renderSnapshotDelta(s: Snapshot) {
  const delta = document.getElementById('snapshot-delta')
  if (!delta || !s.snapshotDate) return
  try {
    if (!manifest) manifest = await fetchJSON<SnapshotManifest>(`${base}data/manifest.json`)
    const index = manifest.snapshots.findIndex(entry => entry.date === s.snapshotDate)
    const previousEntry = index >= 0 ? manifest.snapshots[index + 1] : undefined
    if (!previousEntry) return
    const previous = await fetchJSON<Snapshot>(`${base}data/snapshots/${previousEntry.date}.json`)
    if (previous.playlistId !== s.playlistId) return
    const before = new Set(previous.tracks.map(track => track.id))
    const after = new Set(s.tracks.map(track => track.id))
    const added = s.tracks.filter(track => !before.has(track.id))
    const removed = previous.tracks.filter(track => !after.has(track.id))
    if (!added.length && !removed.length) {
      delta.innerHTML = `<span class="delta-label">SINCE ${previousEntry.date}</span><strong>声音保持不变。</strong><small>有些阶段，不新增也是一种选择。</small>`
      return
    }
    const movement = added.length ? `新增 ${added.length} 首` : ''
    const loss = removed.length ? `${removed.length ? ' · 移除 ' + removed.length + ' 首' : ''}` : ''
    const detail = added[0] ? `最近加入的是《${escapeHtml(added[0].name)}》${added[0].artists[0] ? ` · ${escapeHtml(added[0].artists[0].name)}` : ''}` : '这次整理留下了新的空白。'
    delta.innerHTML = `<span class="delta-label">SINCE ${previousEntry.date}</span><strong>${movement}${loss}</strong><small>${detail}</small>`
  } catch {
    // 历史数据不可用时，不打断主页面
  }
}

function createSvg(host: HTMLElement, render: (svg: SVGSVGElement) => void) {
  host.innerHTML = ''
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('viz')
  host.appendChild(svg)
  render(svg as unknown as SVGSVGElement)
}

function card(opts: { title: string; sub: string; span: 4 | 6 | 8 | 12; kicker: string; index: string }) {
  return makeCard(opts)
}

function renderTrackList(host: HTMLElement, tracks: Track[]) {
  host.innerHTML = '<div class="track-list"></div>'
  const list = host.firstElementChild!
  tracks.slice(0, 6).forEach((t, i) => {
    const row = document.createElement('div')
    row.className = 'track-row'
    row.innerHTML = `<span class="track-rank">${String(i + 1).padStart(2, '0')}</span><img src="${imageUrl(t.album.picUrl)}?param=160y160" alt="" loading="lazy" /><div><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.artists.map(a => a.name).join(' / '))}</span></div><span class="track-score">${Math.round(t.popularity)}</span>`
    list.appendChild(row)
  })
}

function renderMoodRadar(host: HTMLElement, a: Analytics) {
  const rows = [['情绪深度', a.psychology.moodScore], ['推进能量', a.psychology.energyScore], ['记忆浓度', a.psychology.nostalgiaScore], ['探索半径', a.psychology.discoveryScore]]
  host.innerHTML = `<div class="mood-radar">${rows.map(([label, value]) => `<div class="mood-radar-row"><span>${label}</span><div class="bar"><i style="width:${value}%"></i></div><b>${value}</b></div>`).join('')}</div>`
}

function renderSections(s: Snapshot, a: Analytics) {
  const host = document.getElementById('sections')!
  host.innerHTML = ''

  const pick = card({ title: '今日一抽', sub: '给今天留一首背景音乐', span: 4, kicker: 'RANDOM MEMORY', index: '01' })
  renderTodaysPick(pick.body, s.tracks)
  pick.body.addEventListener('click', event => { if ((event.target as HTMLElement).closest('.pick-refresh')) renderTodaysPick(pick.body, s.tracks) })
  host.appendChild(pick.el)

  const palette = card({ title: '封面色谱', sub: '歌单的视觉温度，从色彩开始显影', span: 8, kicker: 'VISUAL PALETTE', index: '03' })
  renderPalette(palette.body, s.tracks)
  host.appendChild(palette.el)

  const decade = card({ title: '年代偏爱', sub: `最常回到的十年 · ${a.dominantDecade?.decade || '—'}`, span: 6, kicker: 'DECADES', index: '04' })
  createSvg(decade.body, svg => renderDecadeChart(svg, a.decade))
  host.appendChild(decade.el)

  const duration = card({ title: '耐心曲线', sub: `平均时长 ${fmtDuration(a.meanDurationSec)} · 你愿意听完一段叙事`, span: 6, kicker: 'ATTENTION SPAN', index: '05' })
  createSvg(duration.body, svg => renderDurationChart(svg, a.duration))
  host.appendChild(duration.el)

  const mood = card({ title: '情绪坐标', sub: '从收藏行为推测出的四个倾向', span: 6, kicker: 'INNER WEATHER', index: '06' })
  renderMoodRadar(mood.body, a)
  host.appendChild(mood.el)

  const voices = card({ title: '声音的常客', sub: '出现次数越多，关系越靠近', span: 6, kicker: 'FAMILIAR VOICES', index: '07' })
  createSvg(voices.body, svg => renderArtistCloud(svg, a.artistsTop))
  host.appendChild(voices.el)

  const popularity = card({ title: '热度光谱', sub: '你如何在共识与私藏之间站位', span: 6, kicker: 'POPULARITY', index: '08' })
  createSvg(popularity.body, svg => renderPopularityHistogram(svg, s.tracks.map(t => t.popularity)))
  host.appendChild(popularity.el)

  const signatures = card({ title: '反复点开的歌', sub: '高热度不代表随大流，而是它们真的陪你走过', span: 6, kicker: 'SIGNATURE TRACKS', index: '09' })
  renderTrackList(signatures.body, [...s.tracks].sort((x, y) => y.popularity - x.popularity))
  host.appendChild(signatures.el)

  const tags = card({ title: '艺人地图', sub: '把熟悉的名字摊开，看见你的音乐社交半径', span: 12, kicker: 'ARTIST CONSTELLATION', index: '10' })
  renderArtistTags(tags.body, a.artistsTop, 34)
  host.appendChild(tags.el)

  if (a.classics.length) {
    const classics = card({ title: '共识里的私藏', sub: `${a.classics.length} 首高热度作品，成为你生活的公共记忆`, span: 6, kicker: 'PUBLIC MEMORY', index: '11' })
    renderCoverWall(classics.body, a.classics, 12)
    host.appendChild(classics.el)
  }
  if (a.hidden.length) {
    const hidden = card({ title: '小众考古', sub: `${a.hidden.length} 首低热度珍宝，只对真正听过的人发光`, span: 6, kicker: 'PRIVATE FINDS', index: '12' })
    renderCoverWall(hidden.body, a.hidden, 12)
    host.appendChild(hidden.el)
  }

  const all = card({ title: '视觉存档', sub: '只留下 48 个切片，让封面墙像一面有呼吸的墙', span: 12, kicker: 'COVER ARCHIVE', index: '13' })
  renderCoverWall(all.body, s.tracks, 48)
  host.appendChild(all.el)
}

function renderAll() {
  if (!current) return
  setTheme(current)
  const a = analyze(current)
  setHero(current, a)
  renderReport(current, a)
  renderTimeline(a)
  renderSections(current, a)
  renderSnapshotDelta(current)
}

async function openSnapshotDialog() {
  if (!manifest) manifest = await fetchJSON<SnapshotManifest>(`${base}data/manifest.json`)
  const dialog = document.getElementById('snapshot-dialog') as HTMLDialogElement
  const list = document.getElementById('snapshot-list')!
  list.innerHTML = ''
  manifest.snapshots.forEach(entry => {
    const li = document.createElement('li')
    if (current?.snapshotDate === entry.date) li.classList.add('is-current')
    li.innerHTML = `<span>${entry.date}</span><span class="dim">${entry.trackCount} 首</span>`
    li.onclick = async () => {
      try { current = await fetchJSON<Snapshot>(`${base}data/snapshots/${entry.date}.json`); renderAll(); dialog.close(); showToast(`已回到 ${entry.date} 的声音档案`) }
      catch (error) { showToast(`快照加载失败：${error instanceof Error ? error.message : '未知错误'}`) }
    }
    list.appendChild(li)
  })
  dialog.showModal()
}

async function swapPlaylist(id: string) {
  const snapshot = await loadSnapshot(id)
  current = snapshot
  const url = new URL(location.href)
  url.searchParams.set('id', id)
  history.pushState({}, '', url)
  renderAll()
}

function wireDialogs() {
  const snapshotDialog = document.getElementById('snapshot-dialog') as HTMLDialogElement
  const swapDialog = document.getElementById('swap-dialog') as HTMLDialogElement
  document.getElementById('snapshot-btn')!.addEventListener('click', () => openSnapshotDialog().catch(() => showToast('历史快照暂时不可用')))
  document.getElementById('swap-btn')!.addEventListener('click', () => {
    const input = document.getElementById('swap-input') as HTMLInputElement
    input.value = playlistIdFromUrl() || ''
    document.getElementById('swap-status')!.textContent = ''
    swapDialog.showModal()
    input.focus()
  })
  document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => (button.closest('dialog') as HTMLDialogElement)?.close()))
  ;[snapshotDialog, swapDialog].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() }))
  document.getElementById('swap-form')!.addEventListener('submit', async event => {
    event.preventDefault()
    const input = document.getElementById('swap-input') as HTMLInputElement
    const status = document.getElementById('swap-status')!
    const button = (event.currentTarget as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement
    const id = input.value.trim()
    if (!/^\d+$/.test(id)) { status.textContent = '请输入纯数字歌单 ID'; status.className = 'form-status error'; return }
    button.disabled = true; status.textContent = '正在读取这份歌单的档案…'; status.className = 'form-status'
    try { await swapPlaylist(id); swapDialog.close(); showToast(`已载入歌单 ${id}`) }
    catch { status.textContent = '没有找到已同步的歌单数据。请确认 ID，或先将数据放入 data/external。'; status.className = 'form-status error' }
    finally { button.disabled = false }
  })
  window.addEventListener('popstate', async () => { try { current = await loadSnapshot(playlistIdFromUrl()); renderAll() } catch { showToast('该歌单数据不可用') } })
}

async function main() {
  startBackground()
  wireDialogs()
  try { current = await loadSnapshot(playlistIdFromUrl()); renderAll() }
  catch (error) {
    document.getElementById('app-root')!.innerHTML = `<section class="hero"><div><p class="hero-eyebrow">ARCHIVE OFFLINE</p><h1>还没有这份声音。</h1><p class="hero-desc">${escapeHtml(error instanceof Error ? error.message : '请先准备 data/latest.json。')}</p></div></section>`
  }
}

main()
