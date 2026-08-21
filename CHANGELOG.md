# Changelog

## [0.1.0] - 2026-08-20
### Features
- 项目骨架：Vite + TypeScript + Python 抓取脚本 + GitHub Actions cron
- 抓取网易云公开歌单详情 + 批量歌曲详情（`/api/playlist/detail` + `/api/song/detail`）
- 数据落盘：`data/latest.json` + `data/snapshots/YYYY-MM-DD.json` + `data/manifest.json`
- 前端基础 UI：暗色极简，封面墙懒入场，鼠标粒子跟随
- 音乐人格分析：艺人 top、年代分布、热度分布、时长分布、付费类型
- 时光机：可切换任意历史快照
- 热插拔：`?id=` 参数加载任意公开歌单

### Design Rationale
- **不引入 React/Vue**：站本身就是阅读型静态页，DOM 量小，原生 + Vite 打包更轻、更快
- **Python 而非 Node 抓取**：网易云接口参数简单，Python 标准库足够，少一份 `node_modules`
- **快照而非覆盖**：每次抓取保留一份历史文件，让「时光机」成为可能，也让数据可追溯
- **D3 而非 ECharts**：审美控制权完全在自己，定制化粒度高，体积更小

### Notes & Caveats
- 红心歌单 `id=710883180` 是用户 UID，对未登录请求需保证歌单设为公开
- 歌曲播放链接涉及版权，不在本项目渲染（避免侵权与噪音）
- 接口每日抓取，建议 cron 不要低于 6h 一次