// 背景粒子 canvas：极轻量；跟随鼠标的彩色粒子
export function startBackground() {
  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  let dpr = window.devicePixelRatio || 1
  let W = 0, H = 0
  let particles: Particle[] = []
  let rafId = 0

  const COLORS = ['#d6ad73', '#a8b9a1', '#d98768', '#c8b08a', '#8f9d85']
  const COUNT = 60

  class Particle {
    x = Math.random() * W
    y = Math.random() * H
    vx = (Math.random() - 0.5) * 0.3
    vy = (Math.random() - 0.5) * 0.3
    r = 0.6 + Math.random() * 1.6
    color = COLORS[Math.floor(Math.random() * COLORS.length)]
    alpha = 0.2 + Math.random() * 0.5
  }

  function resize() {
    dpr = window.devicePixelRatio || 1
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (particles.length === 0) {
      particles = Array.from({ length: COUNT }, () => new Particle())
    }
  }

  let mouseX = -1000, mouseY = -1000
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX
    mouseY = e.clientY
  })

  function tick() {
    ctx.clearRect(0, 0, W, H)

    // 鼠标吸引力
    for (const p of particles) {
      const dx = mouseX - p.x
      const dy = mouseY - p.y
      const d2 = dx * dx + dy * dy
      if (d2 < 16000 && d2 > 100) {
        const f = 0.6 / Math.sqrt(d2)
        p.vx += dx * f * 0.0008
        p.vy += dy * f * 0.0008
      }
      p.x += p.vx
      p.y += p.vy
      // 摩擦
      p.vx *= 0.99
      p.vy *= 0.99
      // 边界反弹
      if (p.x < 0) { p.x = 0; p.vx *= -1 }
      if (p.x > W) { p.x = W; p.vx *= -1 }
      if (p.y < 0) { p.y = 0; p.vy *= -1 }
      if (p.y > H) { p.y = H; p.vy *= -1 }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha
      ctx.fill()
    }

    // 距离 < 80 的连线
    ctx.globalAlpha = 0.15
    ctx.lineWidth = 0.6
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j]
        const dx = a.x - b.x, dy = a.y - b.y
        const d2 = dx * dx + dy * dy
        if (d2 < 6400) {
          ctx.strokeStyle = a.color
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }
    ctx.globalAlpha = 1
    rafId = requestAnimationFrame(tick)
  }

  resize()
  window.addEventListener('resize', resize)
  rafId = requestAnimationFrame(tick)

  // 不可见时停掉，节能
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId)
    else rafId = requestAnimationFrame(tick)
  })
}
