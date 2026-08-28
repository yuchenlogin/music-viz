import type { Track } from '../types'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch))
}

function imageUrl(url: string): string {
  return (url || '').replace(/^http:/, 'https:')
}

export function renderTrackDeck(host: HTMLElement, tracks: Track[], onSelect: (track: Track, index: number) => void) {
  host.innerHTML = ''
  const selection = [...tracks]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 12)
  const rail = document.createElement('div')
  rail.className = 'deck-rail'
  selection.forEach((track, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `deck-thumb ${index === 0 ? 'is-active' : ''}`
    button.dataset.index = String(index)
    button.setAttribute('aria-label', `选择 ${track.name}`)
    button.innerHTML = `<img src="${imageUrl(track.album.picUrl)}?param=160y160" alt="" loading="lazy" /><span>${String(index + 1).padStart(2, '0')}</span>`
    button.addEventListener('click', () => {
      rail.querySelectorAll('.deck-thumb').forEach(item => item.classList.remove('is-active'))
      button.classList.add('is-active')
      onSelect(track, index)
    })
    rail.appendChild(button)
  })
  host.appendChild(rail)
  if (selection[0]) onSelect(selection[0], 0)
}

export function trackHref(track: Track): string {
  return `https://music.163.com/#/song?id=${encodeURIComponent(track.id)}`
}

export function trackImage(track: Track): string {
  return `${imageUrl(track.album.picUrl)}?param=640y640`
}

export function trackTitle(track: Track): string {
  return `${escapeHtml(track.name)} · ${escapeHtml(track.artists.map(artist => artist.name).join(' / '))}`
}
