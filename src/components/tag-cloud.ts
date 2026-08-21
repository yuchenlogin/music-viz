// 标签云：艺人 top N
import type { ArtistCount } from '../analytics'

export function renderArtistTags(host: HTMLElement, artists: ArtistCount[], limit = 24) {
  host.innerHTML = ''
  const wrap = document.createElement('div')
  wrap.className = 'tag-cloud'
  artists.slice(0, limit).forEach((a, i) => {
    const el = document.createElement('span')
    el.className = 'tag'
    el.style.fontSize = `${12 + Math.min(a.count, 10) * 0.6}px`
    el.style.opacity = String(0.55 + Math.min(a.count / artists[0].count, 1) * 0.45)
    el.style.animation = `fade-in .4s ${i * 30}ms ease forwards`
    el.innerHTML = `${escapeHtml(a.name)}<span class="count">${a.count}</span>`
    wrap.appendChild(el)
  })
  host.appendChild(wrap)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!
  ))
}