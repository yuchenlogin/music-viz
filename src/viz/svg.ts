// D3 图表小工具：年代线、时长分布、艺人 top、付费构成
import * as d3 from 'd3'

export interface DecadeDatum { decade: string; year: number; count: number }
export interface DurationDatum { range: string; min: number; max: number; count: number }

export function renderDecadeChart(svgEl: SVGSVGElement, data: DecadeDatum[]) {
  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  const W = svgEl.clientWidth || 600
  const H = 220
  svg.attr('viewBox', `0 0 ${W} ${H}`)

  const m = { t: 18, r: 16, b: 32, l: 36 }
  const iw = W - m.l - m.r, ih = H - m.t - m.b

  const x = d3.scaleBand()
    .domain(data.map(d => d.decade))
    .range([m.l, m.l + iw])
    .padding(0.25)
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) || 1])
    .nice()
    .range([m.t + ih, m.t])

  const g = svg.append('g').attr('class', 'g-main')
  // grid
  g.append('g').attr('class', 'grid')
    .selectAll('line')
    .data(y.ticks(4))
    .join('line')
    .attr('x1', m.l).attr('x2', m.l + iw)
    .attr('y1', d => y(d)).attr('y2', d => y(d))

  // axis
  const ax = svg.append('g').attr('class', 'axis')
  ax.append('g').attr('transform', `translate(0,${m.t + ih})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(8))
    .call(g => g.select('.domain').remove())
  ax.append('g').attr('transform', `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickPadding(8))
    .call(g => {
      g.select('.domain').remove()
      g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.06)')
    })

  // bars with delay
  const bars = g.selectAll('rect.bar')
    .data(data)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.decade)!)
    .attr('width', x.bandwidth())
    .attr('y', m.t + ih)
    .attr('height', 0)
    .attr('fill', 'var(--accent)')
    .attr('rx', 3)
    .attr('opacity', 0.85)

  bars.transition()
    .duration(700)
    .delay((_, i) => i * 60)
    .ease(d3.easeCubicOut)
    .attr('y', d => y(d.count))
    .attr('height', d => m.t + ih - y(d.count))

  // labels on top
  g.selectAll('text.num')
    .data(data)
    .join('text')
    .attr('class', 'num')
    .attr('x', d => (x(d.decade) || 0) + x.bandwidth() / 2)
    .attr('y', d => y(d.count) - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--fg-2)')
    .attr('font-family', 'var(--mono)')
    .attr('font-size', 10)
    .text(d => d.count)
}

export function renderDurationChart(svgEl: SVGSVGElement, data: DurationDatum[]) {
  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  const W = svgEl.clientWidth || 600
  const H = 200
  svg.attr('viewBox', `0 0 ${W} ${H}`)

  const m = { t: 16, r: 12, b: 28, l: 32 }
  const iw = W - m.l - m.r, ih = H - m.t - m.b

  const x = d3.scaleBand()
    .domain(data.map(d => d.range))
    .range([m.l, m.l + iw])
    .padding(0.2)
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) || 1])
    .nice()
    .range([m.t + ih, m.t])

  const g = svg.append('g')
  g.append('g').attr('class', 'grid')
    .selectAll('line').data(y.ticks(4)).join('line')
    .attr('x1', m.l).attr('x2', m.l + iw)
    .attr('y1', d => y(d)).attr('y2', d => y(d))

  const ax = svg.append('g').attr('class', 'axis')
  ax.append('g').attr('transform', `translate(0,${m.t + ih})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(8))
    .call(g => g.select('.domain').remove())
  ax.append('g').attr('transform', `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickPadding(8))
    .call(g => {
      g.select('.domain').remove()
      g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.06)')
    })

  g.selectAll('rect')
    .data(data).join('rect')
    .attr('x', d => x(d.range)!)
    .attr('width', x.bandwidth())
    .attr('y', m.t + ih)
    .attr('height', 0)
    .attr('fill', 'var(--accent-2)')
    .attr('rx', 3)
    .transition().duration(700).ease(d3.easeCubicOut)
    .delay((_, i) => i * 50)
    .attr('y', d => y(d.count))
    .attr('height', d => m.t + ih - y(d.count))
}

export function renderPopularityHistogram(svgEl: SVGSVGElement, pops: number[]) {
  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  const W = svgEl.clientWidth || 600
  const H = 180
  svg.attr('viewBox', `0 0 ${W} ${H}`)
  const m = { t: 16, r: 12, b: 28, l: 32 }
  const iw = W - m.l - m.r, ih = H - m.t - m.b

  const bins = d3.bin().domain([0, 100]).thresholds(10)(pops)
  const x = d3.scaleLinear().domain([0, 100]).range([m.l, m.l + iw])
  const y = d3.scaleLinear().domain([0, d3.max(bins, b => b.length) || 1]).nice()
    .range([m.t + ih, m.t])

  const g = svg.append('g')
  const ax = svg.append('g').attr('class', 'axis')
  ax.append('g').attr('transform', `translate(0,${m.t + ih})`)
    .call(d3.axisBottom(x).ticks(5).tickPadding(8).tickFormat(d => `${d}`))
    .call(g => g.select('.domain').remove())
  ax.append('g').attr('transform', `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickPadding(8))
    .call(g => {
      g.select('.domain').remove()
      g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.06)')
    })

  g.selectAll('rect').data(bins).join('rect')
    .attr('x', d => x(d.x0!) + 1)
    .attr('width', d => Math.max(0, x(d.x1!) - x(d.x0!) - 2))
    .attr('y', m.t + ih)
    .attr('height', 0)
    .attr('fill', 'var(--accent)')
    .attr('opacity', 0.7)
    .attr('rx', 2)
    .transition().duration(600).ease(d3.easeCubicOut)
    .delay((_, i) => i * 40)
    .attr('y', d => y(d.length))
    .attr('height', d => m.t + ih - y(d.length))
}

export interface YearDatum { year: number; count: number }
export function renderYearLine(svgEl: SVGSVGElement, data: YearDatum[]) {
  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  const W = svgEl.clientWidth || 600
  const H = 180
  svg.attr('viewBox', `0 0 ${W} ${H}`)
  const m = { t: 16, r: 12, b: 28, l: 32 }
  const iw = W - m.l - m.r, ih = H - m.t - m.b

  if (!data.length) return
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year) as [number, number])
    .range([m.l, m.l + iw])
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) || 1])
    .nice()
    .range([m.t + ih, m.t])

  const ax = svg.append('g').attr('class', 'axis')
  ax.append('g').attr('transform', `translate(0,${m.t + ih})`)
    .call(d3.axisBottom(x).ticks(6).tickPadding(8).tickFormat(d3.format('d')))
    .call(g => g.select('.domain').remove())
  ax.append('g').attr('transform', `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickPadding(8))
    .call(g => {
      g.select('.domain').remove()
      g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.06)')
    })

  const line = d3.line<YearDatum>()
    .x(d => x(d.year))
    .y(d => y(d.count))
    .curve(d3.curveMonotoneX)
  const area = d3.area<YearDatum>()
    .x(d => x(d.year))
    .y0(m.t + ih)
    .y1(d => y(d.count))
    .curve(d3.curveMonotoneX)

  const g = svg.append('g')
  g.append('path').datum(data)
    .attr('d', area as any)
    .attr('fill', 'var(--accent)')
    .attr('opacity', 0.18)

  const path = g.append('path').datum(data)
    .attr('d', line as any)
    .attr('fill', 'none')
    .attr('stroke', 'var(--accent)')
    .attr('stroke-width', 1.5)
  const total = (path.node() as SVGPathElement).getTotalLength()
  path.attr('stroke-dasharray', `${total} ${total}`)
    .attr('stroke-dashoffset', total)
    .transition().duration(1200).ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0)

  // dots
  g.selectAll('circle').data(data).join('circle')
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d.count))
    .attr('r', 0)
    .attr('fill', 'var(--accent-2)')
    .transition().duration(300).delay((_, i) => 400 + i * 30)
    .attr('r', 2)
}

export interface ArtistDatum { id: number; name: string; count: number; cover?: string }
export function renderArtistCloud(svgEl: SVGSVGElement, data: ArtistDatum[]) {
  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()
  const W = svgEl.clientWidth || 600
  const H = 240
  svg.attr('viewBox', `0 0 ${W} ${H}`)

  const top = data.slice(0, 18)
  const max = top[0]?.count || 1
  const min = top[top.length - 1]?.count || 1
  const size = d3.scaleSqrt().domain([min, max]).range([12, 30])

  // 简单排布：分两行
  const half = Math.ceil(top.length / 2)
  const row1 = top.slice(0, half)
  const row2 = top.slice(half)

  const place = (row: ArtistDatum[], y: number) => {
    // 简单按字符宽度粗略排版
    const total = row.reduce((acc, d) => acc + d.name.length * size(d.count) * 0.6 + 16, 0)
    let x = (W - Math.min(total, W - 24)) / 2
    return row.map(d => ({
      ...d,
      x: x,
      y: y + size(d.count) / 2,
      w: d.name.length * size(d.count) * 0.6 + 12,
    })).map(o => { x += o.w + 8; return o })
  }

  const laid = [...place(row1, 60), ...place(row2, 160)]

  const g = svg.append('g')
  g.selectAll('text').data(laid).join('text')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('text-anchor', 'start')
    .attr('fill', d => d === laid[0] ? 'var(--accent)' : 'var(--fg)')
    .attr('font-size', d => `${size(d.count)}px`)
    .attr('font-family', 'var(--serif)')
    .attr('opacity', 0)
    .text(d => d.name)
    .transition().duration(400).delay((_, i) => i * 50)
    .attr('opacity', d => 0.4 + (d.count / max) * 0.6)
}