// 封面墙组件：懒入场、悬停显示元数据
import type { Track } from '../types'

export function renderCoverWall(host: HTMLElement, tracks: Track[], limit = 60) {
  host.innerHTML = ''
  const grid = document.createElement('div')
  grid.className = 'cover-grid'
  host.appendChild(grid)

  const list = tracks.slice(0, limit)
  const frag = document.createDocumentFragment()
  list.forEach((t, i) => {
    const el = document.createElement('div')
    el.className = 'cover'
    el.style.animationDelay = `${Math.min(i * 25, 1500)}ms`
    el.innerHTML = `
      <img loading="lazy" src="${t.album.picUrl}?param=240y240" alt="${t.name}" />
      <div class="meta">
        <b>${escapeHtml(t.name)}</b>
        <span>${escapeHtml(t.artists.map(a => a.name).join(' / '))}</span>
      </div>
    `
    frag.appendChild(el)
  })
  grid.appendChild(frag)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!
  ))
}