// 把 data/ 同步到 public/data/（构建/开发前运行）
// GitHub Actions 里 workflow 也会做同样的事
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'data')
const dst = resolve(root, 'public/data')

if (!existsSync(src)) {
  console.error('[sync-data] data/ 不存在，请先运行 python3 scripts/fetch_playlist.py')
  process.exit(0) // 不阻断，让 build 继续（前端会优雅降级）
}
mkdirSync(dst, { recursive: true })
cpSync(src, dst, { recursive: true })
console.log('[sync-data] data → public/data 同步完成')