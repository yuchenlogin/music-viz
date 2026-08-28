// 通用卡片：H3 + 副标题 + 内容插槽
export function makeCard(opts: {
  title: string
  sub?: string
  span?: 4 | 6 | 8 | 12
  kicker?: string
  index?: string
}): { el: HTMLElement; body: HTMLElement } {
  const tpl = document.getElementById('tpl-section') as HTMLTemplateElement
  const node = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement
  if (opts.span) node.classList.add(`span-${opts.span}`)
  node.querySelector('h3')!.textContent = opts.title
  const kicker = node.querySelector('.card-kicker')
  if (kicker) kicker.textContent = opts.kicker || 'LISTENING NOTE'
  const index = node.querySelector('.card-index')
  if (index) index.textContent = opts.index || ''
  if (opts.sub) {
    const sub = node.querySelector('.card-sub')!
    sub.textContent = opts.sub
  }
  const body = node.querySelector('.card-body') as HTMLElement
  return { el: node, body }
}
