// 调色板条：把多张封面的主色按行展示
import { extractPalette } from '../viz/palette'
import type { Track } from '../types'

export async function renderPalette(host: HTMLElement, tracks: Track[], sampleCount = 12) {
  host.innerHTML = ''
  const wrap = document.createElement('div')
  wrap.className = 'palette'
  host.appendChild(wrap)

  // 选 sampleCount 张（按 popularity 选，覆盖度高）
  const sorted = [...tracks].sort((a, b) => b.popularity - a.popularity)
  const samples: Track[] = []
  const step = Math.max(1, Math.floor(sorted.length / sampleCount))
  for (let i = 0; i < sorted.length && samples.length < sampleCount; i += step) {
    samples.push(sorted[i])
  }

  for (const t of samples) {
    const span = document.createElement('span')
    span.style.background = 'var(--surface-2)'
    span.style.transition = 'background 0.4s ease'
    span.title = `${t.name} - ${t.artists.map(a => a.name).join('/')}`
    wrap.appendChild(span)

    extractPalette(t.album.picUrl, 1).then(([c]) => {
      if (c) span.style.background = c
    })
  }
}