import './style.css'
import { startBackground } from './bg-canvas'
import { analyze, timeBasedTheme } from './analytics'
import type { Analytics } from './analytics'
import type { Snapshot, SnapshotManifest, Track } from './types'
import { renderArtistTags } from './components/tag-cloud'
import { renderPalette } from './components/palette-bar'
import { renderTrackDeck, trackHref, trackImage } from './components/track-deck'
import { dominantColor } from './viz/palette'
import { renderYearLine } from './viz/svg'

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
  return fetchJSON<Snapshot>(id ? `${base}data/external/${id}.json` : `${base}data/latest.json`)
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch))
}

function md(value: string): string {
  return escapeHtml(value).replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
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
  if (cover) dominantColor(cover).then(color => document.documentElement.style.setProperty('--cover-tint', color))
}

function selectStageTrack(track: Track) {
  const trackEl = document.getElementById('stage-track')!
  const artistEl = document.getElementById('stage-artist')!
  const linkEl = document.getElementById('stage-link') as HTMLAnchorElement
  trackEl.textContent = track.name
  artistEl.textContent = track.artists.map(artist => artist.name).join(' / ')
  linkEl.href = trackHref(track)
}

function setHero(s: Snapshot, a: Analytics) {
  const playlist = s.playlist
  const cover = imageUrl(playlist.coverImgUrl || playlist.cover)
  const trackCount = playlist.trackCount || s.tracks.length
  const focus = a.classics[0] || s.tracks[0]
  document.getElementById('playlist-name')!.textContent = playlist.name || '未命名歌单'
  document.getElementById('playlist-cover')!.setAttribute('src', cover)
  document.getElementById('playlist-cover')!.setAttribute('alt', `${playlist.name} 封面`)
  document.getElementById('playlist-desc')!.textContent = playlist.description || `从 ${fmtDate(playlist.createTime)} 开始，这份歌单用 ${trackCount} 首歌记录了一个人的迁徙、停留与重新出发。`
  document.getElementById('snapshot-date')!.textContent = s.snapshotDate || '最新快照'
  document.getElementById('hero-track-count')!.textContent = String(trackCount)
  document.getElementById('hero-year-range')!.textContent = `${a.yearSpan.min || '—'}—${a.yearSpan.max || '—'}`
  document.getElementById('archive-index')!.textContent = String(Math.max(1, a.yearSpan.max - a.yearSpan.min + 1)).padStart(2, '0')
  document.getElementById('hero-top-artist')!.textContent = a.topArtist?.name || '—'
  document.getElementById('hero-top-artist-count')!.textContent = a.topArtist ? `${a.topArtist.count} 次出现` : '还没有足够数据'
  document.getElementById('hero-created')!.textContent = fmtDate(playlist.createTime)
  document.getElementById('hero-updated')!.textContent = `最近整理 ${fmtDate(playlist.updateTime)}`
  document.getElementById('hero-footnote-text')!.textContent = `${a.psychology.archetype} · 基于 ${s.snapshotDate || '最新'} 快照`
  if (focus) selectStageTrack(focus)

  const meta = document.getElementById('hero-meta')!
  meta.innerHTML = ''
  ;[`${trackCount} 首收藏`, `${a.yearSpan.min || '—'} — ${a.yearSpan.max || '—'}`, `平均 ${fmtDuration(a.meanDurationSec)}`, `播放 ${Number(playlist.playCount || 0).toLocaleString('zh-CN')}`].forEach(value => {
    const span = document.createElement('span')
    span.textContent = value
    meta.appendChild(span)
  })
}

function meter(value: number): string {
  const filled = Math.round(value / 10)
  return `<div class="meter" aria-label="${value} 分">${Array.from({ length: 10 }, (_, index) => `<i class="${index < filled ? 'on' : ''}"></i>`).join('')}</div>`
}

function renderPersonality(a: Analytics) {
  const personality = a.personality
  const profile = a.psychology
  document.getElementById('portrait-stamp')!.textContent = profile.emotionalTone
  document.getElementById('personality-headline')!.innerHTML = md(personality.headline)
  document.getElementById('personality-quote')!.innerHTML = md(personality.quote)
  document.getElementById('personality-meta')!.textContent = `${personality.meta} · 音乐心理画像（非临床诊断）`
  const host = document.getElementById('mood-radar')!
  const rows: [string, string, number][] = [
    ['情绪深度', 'MOOD', profile.moodScore],
    ['推进能量', 'ENERGY', profile.energyScore],
    ['记忆浓度', 'MEMORY', profile.nostalgiaScore],
    ['探索半径', 'DISCOVERY', profile.discoveryScore],
  ]
  host.innerHTML = rows.map(([label, english, value]) => `<div class="signal-row"><div class="signal-label"><span>${label}</span><small>${english}</small></div><div class="signal-track"><i style="width:${value}%"></i></div><strong>${value}</strong></div>`).join('')
  host.insertAdjacentHTML('beforeend', `<div class="signal-quote">${escapeHtml(profile.emotionalSummary)}</div>`)
}

function renderTimeline(a: Analytics) {
  const chartHost = document.getElementById('timeline-chart')!
  chartHost.innerHTML = ''
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('viz')
  chartHost.appendChild(svg)
  renderYearLine(svg as unknown as SVGSVGElement, a.year)
  document.getElementById('timeline-range')!.textContent = `${a.yearSpan.min || '—'} — ${a.yearSpan.max || '—'}`
  const story = document.getElementById('timeline-story')!
  const dominant = a.dominantDecade
  const oldest = a.year[0]
  const newest = a.year[a.year.length - 1]
  story.innerHTML = `<div><p class="story-index">THE MEMORY LINE / ${a.year.length} YEARS</p><h3>${dominant ? `你总会回到<br /><i>${dominant.decade}</i>。` : '时间还在<br /><i>生成中。</i>'}</h3><p>${dominant ? `这一段年代贡献了 ${dominant.count} 首歌，它不是怀旧，而是你与某种声音建立过的长期关系。` : '当更多快照被保存，时间会慢慢显出它的纹理。'}</p></div><div class="story-foot"><span>最早发行<strong>${oldest?.year || '—'}</strong></span><span>最近发行<strong>${newest?.year || '—'}</strong></span></div><div id="snapshot-delta" class="snapshot-delta"></div>`
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
    const change = added.length || removed.length ? `${added.length ? `新增 ${added.length} 首` : ''}${removed.length ? ` · 移除 ${removed.length} 首` : ''}` : '声音保持不变。'
    const detail = added[0] ? `最近加入的是《${escapeHtml(added[0].name)}》 · ${escapeHtml(added[0].artists.map(artist => artist.name).join(' / '))}` : '有些阶段，不新增也是一种选择。'
    delta.innerHTML = `<span class="delta-label">SINCE ${previousEntry.date}</span><strong>${change}</strong><small>${detail}</small>`
  } catch {
    // 历史数据不可用时，不打断主页面。
  }
}

function renderTrackSelection(track: Track, index: number) {
  const deckStage = document.querySelector('.deck-stage') as HTMLElement | null
  if (deckStage) deckStage.style.setProperty('--deck-image', `url("${trackImage(track)}")`)
  document.getElementById('deck-cover')!.setAttribute('src', trackImage(track))
  document.getElementById('deck-cover')!.setAttribute('alt', `${track.name} 封面`)
  document.getElementById('deck-position')!.textContent = `${String(index + 1).padStart(2, '0')} / 12`
  document.getElementById('deck-title')!.textContent = track.name
  document.getElementById('deck-artist')!.textContent = track.artists.map(artist => artist.name).join(' / ')
  document.getElementById('deck-year')!.textContent = track.publishYear ? String(track.publishYear) : 'YEAR —'
  document.getElementById('deck-duration')!.textContent = fmtDuration(track.durationSec)
  document.getElementById('deck-popularity')!.textContent = `${Math.round(track.popularity)} / 100`
  document.getElementById('deck-link')!.setAttribute('href', trackHref(track))
}

function renderLibrary(s: Snapshot, a: Analytics) {
  renderTrackDeck(document.getElementById('track-deck')!, s.tracks, renderTrackSelection)
  document.getElementById('artist-lead-name')!.textContent = a.topArtist?.name || '—'
  document.getElementById('artist-lead-count')!.textContent = a.topArtist ? `${a.topArtist.count} 首作品与你相遇` : '—'
  renderArtistTags(document.getElementById('artist-tags')!, a.artistsTop, 20)
  renderPalette(document.getElementById('palette-strip')!, s.tracks, 10)
  const mean = Math.round(a.meanDurationSec)
  document.getElementById('mean-duration')!.textContent = fmtDuration(mean)
  document.getElementById('duration-progress')!.style.width = `${Math.max(12, Math.min(100, ((mean - 150) / 240) * 100))}%`
  document.getElementById('duration-copy')!.textContent = a.meanDurationSec >= 280 ? '你愿意把一段叙事听完，耐心本身也是一种品味。' : a.meanDurationSec <= 210 ? '你擅长快速换气，让不同场景拥有不同的速度。' : '不疾不徐，歌曲长度像一条稳定的日常轨道。'
}

function renderAll() {
  if (!current) return
  const analytics = analyze(current)
  setTheme(current)
  setHero(current, analytics)
  renderPersonality(analytics)
  renderTimeline(analytics)
  renderLibrary(current, analytics)
  renderSnapshotDelta(current)
}

function setupMotion() {
  const stage = document.getElementById('hero-stage')
  stage?.addEventListener('pointermove', event => {
    const rect = stage.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - .5) * 16
    const y = ((event.clientY - rect.top) / rect.height - .5) * 16
    stage.style.setProperty('--stage-x', `${x.toFixed(2)}px`)
    stage.style.setProperty('--stage-y', `${y.toFixed(2)}px`)
  })
  stage?.addEventListener('pointerleave', () => {
    stage.style.setProperty('--stage-x', '0px')
    stage.style.setProperty('--stage-y', '0px')
  })
  const sections = document.querySelectorAll('.section-block')
  if (!('IntersectionObserver' in window)) {
    sections.forEach(section => section.classList.add('is-visible'))
    return
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    }
  }), { threshold: .12 })
  sections.forEach(section => observer.observe(section))
}

async function openSnapshotDialog() {
  if (!manifest) manifest = await fetchJSON<SnapshotManifest>(`${base}data/manifest.json`)
  const dialog = document.getElementById('snapshot-dialog') as HTMLDialogElement
  const list = document.getElementById('snapshot-list')!
  list.innerHTML = ''
  manifest.snapshots.forEach(entry => {
    const item = document.createElement('li')
    if (current?.snapshotDate === entry.date) item.classList.add('is-current')
    item.innerHTML = `<span>${entry.date}</span><span class="dim">${entry.trackCount} 首</span>`
    item.onclick = async () => {
      try { current = await fetchJSON<Snapshot>(`${base}data/snapshots/${entry.date}.json`); renderAll(); dialog.close(); showToast(`已回到 ${entry.date} 的声音档案`) }
      catch (error) { showToast(`快照加载失败：${error instanceof Error ? error.message : '未知错误'}`) }
    }
    list.appendChild(item)
  })
  dialog.showModal()
}

async function swapPlaylist(id: string) {
  current = await loadSnapshot(id)
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
  setupMotion()
}

main()
