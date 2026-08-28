// 音乐品味分析：从快照中提取可视化数据
import type { Snapshot, Track } from './types'

export interface DecadeBucket {
  decade: string     // e.g. "2010s"
  year: number       // 代表年份（decade 起点）
  count: number
}

export interface ArtistCount {
  id: number
  name: string
  count: number
  cover?: string     // 第一首歌的封面
}

export interface YearBucket {
  year: number
  count: number
}

export interface DurationBucket {
  range: string
  min: number
  max: number
  count: number
}

export interface PersonalityReport {
  headline: string
  quote: string
  meta: string
}

export interface PsychologyProfile {
  archetype: string
  emotionalTone: string
  emotionalSummary: string
  rhythm: string
  rhythmSummary: string
  curiosity: string
  curiositySummary: string
  memory: string
  memorySummary: string
  moodScore: number
  energyScore: number
  nostalgiaScore: number
  discoveryScore: number
}

export interface Analytics {
  total: number
  decade: DecadeBucket[]
  artistsTop: ArtistCount[]
  year: YearBucket[]
  duration: DurationBucket[]
  fee: { free: number; album: number; lowQuality: number }
  meanDurationSec: number
  medianDurationSec: number
  meanPopularity: number
  yearSpan: { min: number; max: number }
  dominantDecade: DecadeBucket | null
  topArtist: ArtistCount | null
  classics: Track[]       // 流行度 >= 95
  hidden: Track[]          // 流行度 < 40（冷门珍藏）
  paletteHex: string[]    // 从封面提取的 6 色 hex（懒解析，前端取）
  personality: PersonalityReport
  psychology: PsychologyProfile
}

const fmt = (n: number) => n.toLocaleString('en-US')

function pick<T>(arr: T[], i: number): T | undefined {
  return arr[i]
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function analyze(snap: Snapshot): Analytics {
  const tracks = snap.tracks

  // 十年分布
  const decadeMap = new Map<string, DecadeBucket>()
  for (const t of tracks) {
    if (!t.publishYear) continue
    const start = Math.floor(t.publishYear / 10) * 10
    const key = `${start}s`
    const cur = decadeMap.get(key) || { decade: key, year: start, count: 0 }
    cur.count++
    decadeMap.set(key, cur)
  }
  const decade = [...decadeMap.values()].sort((a, b) => a.year - b.year)

  // 艺人 top
  const artistMap = new Map<number, ArtistCount>()
  for (const t of tracks) {
    for (const a of t.artists) {
      const cur = artistMap.get(a.id) || { id: a.id, name: a.name, count: 0, cover: t.album.picUrl }
      cur.count++
      if (!cur.cover) cur.cover = t.album.picUrl
      artistMap.set(a.id, cur)
    }
  }
  const artistsTop = [...artistMap.values()].sort((a, b) => b.count - a.count)

  // 年份分布
  const yearMap = new Map<number, number>()
  for (const t of tracks) {
    if (!t.publishYear) continue
    yearMap.set(t.publishYear, (yearMap.get(t.publishYear) || 0) + 1)
  }
  const year = [...yearMap.entries()]
    .map(([y, c]) => ({ year: y, count: c }))
    .sort((a, b) => a.year - b.year)

  // 时长分布
  const buckets: DurationBucket[] = [
    { range: '<2 分钟', min: 0, max: 120, count: 0 },
    { range: '2-3 分钟', min: 120, max: 180, count: 0 },
    { range: '3-4 分钟', min: 180, max: 240, count: 0 },
    { range: '4-5 分钟', min: 240, max: 300, count: 0 },
    { range: '5-6 分钟', min: 300, max: 360, count: 0 },
    { range: '>6 分钟', min: 360, max: Infinity, count: 0 },
  ]
  const durs: number[] = []
  for (const t of tracks) {
    durs.push(t.durationSec)
    for (const b of buckets) {
      if (t.durationSec >= b.min && t.durationSec < b.max) { b.count++; break }
    }
  }

  // fee 类型
  const fee = { free: 0, album: 0, lowQuality: 0 }
  for (const t of tracks) {
    if (t.fee === 0) fee.free++
    else if (t.fee === 8) fee.lowQuality++
    else fee.album++
  }

  const meanDur = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0
  const meanPop = tracks.length ? tracks.reduce((a, b) => a + b.popularity, 0) / tracks.length : 0
  const ys = year.map(y => y.year)
  const yearSpan = { min: ys.length ? Math.min(...ys) : 0, max: ys.length ? Math.max(...ys) : 0 }

  const dominantDecade = decade.length
    ? decade.reduce((a, b) => (b.count > a.count ? b : a))
    : null
  const topArtist = artistsTop[0] || null

  // 经典 & 冷门
  const classics = tracks.filter(t => t.popularity >= 95)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 12)
  const hidden = tracks.filter(t => t.popularity < 40)
    .sort((a, b) => a.popularity - b.popularity)
    .slice(0, 12)

  // 人格报告
  const personality = makePersonality({
    total: tracks.length,
    dominantDecade,
    topArtist,
    meanPop,
    meanDur,
    classics: classics.length,
    hidden: hidden.length,
    yearSpan,
  })

  const psychology = makePsychology({ tracks, artistsTop, yearSpan, meanDur, meanPop, year })

  return {
    total: tracks.length,
    decade,
    artistsTop,
    year,
    duration: buckets,
    fee,
    meanDurationSec: meanDur,
    medianDurationSec: median(durs),
    meanPopularity: meanPop,
    yearSpan,
    dominantDecade,
    topArtist,
    classics,
    hidden,
    paletteHex: [],
    personality,
    psychology,
  }
}

function makePsychology(p: {
  tracks: Track[]
  artistsTop: ArtistCount[]
  yearSpan: { min: number; max: number }
  meanDur: number
  meanPop: number
  year: YearBucket[]
}): PsychologyProfile {
  const text = p.tracks.map(t => `${t.name} ${t.artists.map(a => a.name).join(' ')}`).join(' ')
  const countMatches = (words: string[]) => words.reduce((sum, word) => sum + (text.toLowerCase().split(word.toLowerCase()).length - 1), 0)
  const reflective = countMatches(['夜', '月', '梦', '想念', '思念', '离开', '后来', '孤独', '雨', 'remember', 'love', 'miss', 'home', 'alone'])
  const bright = countMatches(['sun', 'light', 'day', 'happy', 'dance', '夏', '晴', '笑', '快乐', '勇敢', '自由'])
  const intense = countMatches(['rock', 'metal', 'live', 'fire', '战', '狂', 'break', 'run', 'heart'])
  const recent = p.tracks.filter(t => (t.publishYear || 0) >= 2020).length
  const classic = p.tracks.filter(t => (t.publishYear || 0) > 0 && (t.publishYear || 0) < 2010).length
  const uniqueArtistRatio = p.artistsTop.length / Math.max(1, p.tracks.length)
  const moodScore = Math.max(18, Math.min(92, 52 + reflective * 3 - bright * 1.6))
  const energyScore = Math.max(18, Math.min(92, 42 + intense * 3 + (p.meanPop - 70) * 0.25))
  const nostalgiaScore = Math.max(15, Math.min(94, 24 + classic / Math.max(1, p.tracks.length) * 100 * 0.7 + (p.yearSpan.max - p.yearSpan.min > 30 ? 12 : 0)))
  const discoveryScore = Math.max(18, Math.min(92, 28 + uniqueArtistRatio * 100 * 0.95 + recent / Math.max(1, p.tracks.length) * 25))

  const emotionalTone = moodScore > 68
    ? '夜行的感受力'
    : energyScore > 68
      ? '带电的生命力'
      : '留白里的平衡'
  const emotionalSummary = moodScore > 68
    ? '你会把不便言说的部分交给旋律保管，情绪不是噪音，而是观察生活的方式。'
    : energyScore > 68
      ? '你的收藏里有明显的推进感：需要向前时，音乐会先替你把灯打开。'
      : '你不急着把情绪说满，明亮与阴影并置，给自己留出回声。'
  const rhythm = p.meanDur >= 280 ? '长镜头式聆听' : p.meanDur <= 210 ? '短章式切换' : '稳定的中速呼吸'
  const rhythmSummary = p.meanDur >= 280
    ? '平均时长偏长，说明你愿意把一段叙事听完，而不是只寻找即时刺激。'
    : p.meanDur <= 210
      ? '短歌比例更高，你擅长在不同场景之间快速换气。'
      : '歌曲长度分布均衡，像一条不疾不徐的日常轨道。'
  const curiosity = discoveryScore > 65 ? '开放式收藏家' : '深挖式收藏家'
  const curiositySummary = discoveryScore > 65
    ? '艺人跨度与近年作品都很丰富，你会持续给未知留位置。'
    : '你更在意关系的深度，常常沿着熟悉的声音继续向下挖掘。'
  const memory = nostalgiaScore > 65 ? '记忆驱动型' : '当下感知型'
  const memorySummary = nostalgiaScore > 65
    ? '旧年代作品占据重要位置，某些年份像私人坐标，随时可以回到当时。'
    : '新近作品占比不低，你更习惯让正在发生的生活进入歌单。'

  return {
    archetype: `${emotionalTone} · ${rhythm}`,
    emotionalTone,
    emotionalSummary,
    rhythm,
    rhythmSummary,
    curiosity,
    curiositySummary,
    memory,
    memorySummary,
    moodScore: Math.round(moodScore),
    energyScore: Math.round(energyScore),
    nostalgiaScore: Math.round(nostalgiaScore),
    discoveryScore: Math.round(discoveryScore),
  }
}

// 生成有「文青感」的人格报告
function makePersonality(p: {
  total: number
  dominantDecade: DecadeBucket | null
  topArtist: ArtistCount | null
  meanPop: number
  meanDur: number
  classics: number
  hidden: number
  yearSpan: { min: number; max: number }
}): PersonalityReport {
  const lines: string[] = []
  const tags: string[] = []

  if (p.topArtist) {
    lines.push(
      `${p.total} 首歌里，你与 *${p.topArtist.name}* 相遇了 ${p.topArtist.count} 次。`
    )
  }
  if (p.dominantDecade) {
    lines.push(
      `你更愿意回到 *${p.dominantDecade.decade}* —— 那十年贡献了 ${p.dominantDecade.count} 首。`
    )
  }
  if (p.yearSpan.min && p.yearSpan.max) {
    lines.push(
      `你的耳朵横跨 *${p.yearSpan.max - p.yearSpan.min}* 年。`
    )
  }
  if (p.meanDur) {
    const min = (p.meanDur / 60).toFixed(1)
    if (p.meanDur > 280) tags.push('长叙事型')
    else if (p.meanDur < 200) tags.push('短句电波型')
    else tags.push('标准流行')
    lines.push(`平均时长 *${min} 分钟*，你是 ${tags[tags.length - 1]}。`)
  }
  if (p.meanPop > 90) tags.push('主流共识')
  else if (p.meanPop < 60) tags.push('小众收藏家')
  else tags.push('大众与小众之间')

  if (p.hidden >= 5) tags.push('考古学家')
  if (p.classics >= 8) tags.push('热门猎人')

  const headline = `你是一个 *${tags.join(' · ')}* 的人。`
  const meta = `音乐人格计算于 ${new Date().toISOString().slice(0, 10)} · 基于 ${p.total} 首歌`

  // 找一句应景的引言（不查库，凭印象）
  const pool = [
    'Music expresses that which cannot be said and on which it is impossible to be silent. — Hugo',
    'Where words fail, music speaks. — Hans Christian Andersen',
    'Music is the shorthand of emotion. — Leo Tolstoy',
    'One good thing about music, when it hits you, you feel no pain. — Bob Marley',
    'Music is the literature of the heart. — Alphonse de Lamartine',
  ]
  // 用 today 的种子选一句，但保持稳定
  const today = new Date()
  const seed = today.getFullYear() * 1000 + today.getMonth() * 50 + today.getDate()
  const quote = pool[seed % pool.length]

  return { headline, quote: lines.join(' '), meta }
}

export function pickRandom<T>(arr: T[]): T | undefined {
  return pick(arr, Math.floor(Math.random() * arr.length))
}

// 给定一首歌，从歌名/艺人生成一句应景的话
const POEMS = [
  '听这一首的时候，请把灯关掉。',
  '适合在午夜的车里单曲循环。',
  '它的旋律像一条慢慢走远的小路。',
  '点开它之前，先深呼吸。',
  '这首里有你要的答案。',
  '把它当成今天的背景色。',
  '这一首，等你很久了。',
  '戴上耳机，再点开。',
  '你不一定会爱上，但你会记得它。',
  '如果此刻有雨，那就刚好。',
]

export function poemFor(_track: Track): string {
  return POEMS[Math.floor(Math.random() * POEMS.length)]
}

// 时间感：根据当前时间选主题
export function timeBasedTheme(): 'aurora' | 'dawn' | 'meadow' | 'void' {
  const h = new Date().getHours()
  if (h >= 5 && h < 9) return 'dawn'
  if (h >= 9 && h < 17) return 'aurora'
  if (h >= 17 && h < 20) return 'dawn'
  return 'void'
}
