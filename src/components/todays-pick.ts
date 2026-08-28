// 今日一抽
import type { Track } from '../types'
import { pickRandom, poemFor } from '../analytics'

export function renderTodaysPick(host: HTMLElement, tracks: Track[]) {
  host.innerHTML = ''
  const t = pickRandom(tracks)
  if (!t) return
  const wrap = document.createElement('div')
  wrap.className = 'todays-pick'
  wrap.innerHTML = `
    <div class="pick-art">
      <img src="${t.album.picUrl}?param=320y320" alt="" />
      <span class="pick-orbit"></span>
    </div>
    <div class="pick-copy">
      <div class="pick-kicker">TODAY'S LISTENING NOTE</div>
      <h4>${escapeHtml(t.name)}</h4>
      <div class="ar">${escapeHtml(t.artists.map(a => a.name).join(' / '))}</div>
      <div class="poem">${escapeHtml(poemFor(t))}</div>
      <button class="pick-refresh" type="button">换一首 <span>↗</span></button>
    </div>
  `
  host.appendChild(wrap)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!
  ))
}
