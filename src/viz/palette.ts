// 从封面图片提取主色调 → 用于"调色板"区块
export async function extractPalette(imgUrl: string, sampleSize = 6): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        const w = 64, h = 64
        c.width = w; c.height = h
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const data = ctx.getImageData(0, 0, w, h).data
        // 量化到 24 bin，统计直方图
        const bins = new Map<string, { r: number, g: number, b: number, n: number }>()
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          if (a < 200) continue
          // 浅色丢掉 (高 v)
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
          if (mx > 245 && mn > 220) continue
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`
          const cur = bins.get(key) || { r: 0, g: 0, b: 0, n: 0 }
          cur.r += r; cur.g += g; cur.b += b; cur.n++
          bins.set(key, cur)
        }
        const sorted = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, sampleSize)
        const hex = sorted.map(({ r, g, b, n }) => {
          const rr = Math.round(r / n), gg = Math.round(g / n), bb = Math.round(b / n)
          return `#${[rr, gg, bb].map(x => x.toString(16).padStart(2, '0')).join('')}`
        })
        resolve(hex)
      } catch {
        resolve([])
      }
    }
    img.onerror = () => resolve([])
    img.src = imgUrl
  })
}

// 提取单张图的主色调
export async function dominantColor(imgUrl: string): Promise<string> {
  const palette = await extractPalette(imgUrl, 1)
  return palette[0] || '#79f0d0'
}