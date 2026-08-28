# 🎵 Music Viz · 我的音乐人格

> 一个有品味、动态、长期可更新的网易云音乐品味可视化站点。
> 每天自动抓取你的「我喜欢的音乐」歌单，渲染成会呼吸的极简 UI。

## ✨ 它做什么

- 🤖 **自动抓取**：每天定时（GitHub Actions）抓取网易云红心歌单 → 历史快照永久保存
- 🎨 **极简动态 UI**：暗色系、封面入场动画、鼠标粒子跟随、季节配色随时间变化
- 📊 **音乐品味分析**：艺人分布、年代线、热度、时长、付费率、深夜情绪曲线
- 🧠 **音乐人格报告**：每天生成一段不一样的「今日乐评」
- ⏰ **时光机**：任意日期快照对比，看一个月前/一年前的你听什么
- 🔌 **热插拔**：URL `?id=xxx` 可换成任意公开歌单，一键生成对方品味页
- 🎲 **今日一抽**：随机一首歌，配一句诗

## 🛠 技术栈

- **前端**：Vite + TypeScript + 原生 + D3.js（轻量无大框架）
- **抓取**：Python（urllib，无需第三方依赖）
- **部署**：GitHub Pages + GitHub Actions cron

## 🚀 本地开发

```bash
# 安装前端依赖
npm install

# 抓一次数据（默认抓歌单 710883180）
python3 scripts/fetch_playlist.py

# 启动 dev server
npm run dev
```

## 🌐 部署

1. 把仓库推到 GitHub（仓库名建议 `music-viz`，与 `vite.config.ts` 的 base 一致；若不同，改 `VITE_BASE` 或 vite config）
2. 打开仓库 **Settings → Pages**，Source 选择 **GitHub Actions**
3. 手动触发一次 workflow（Actions → daily-update → Run workflow），即可完成首次抓取 + 部署

`.github/workflows/daily.yml` 之后会：
1. 每天 UTC 22:00 跑抓取脚本，把结果 commit 回 `data/snapshots/`（历史快照永久保留）
2. 同时 build 前端并部署到 GitHub Pages

**手动触发 + 传歌单 ID**：在 Actions → Run workflow 时输入 `playlist_id`（非默认歌单），
数据会存为 `data/external/<id>.json`，别人访问 `?id=<id>` 就能看到对方的品味页。

## 📁 目录

```
music-viz/
├── scripts/
│   └── fetch_playlist.py     # 抓取歌单
├── data/
│   ├── latest.json           # 最新一份快照（前端主加载）
│   ├── manifest.json         # 所有历史快照清单（时光机用）
│   └── snapshots/
│       └── YYYY-MM-DD.json   # 历史快照
├── src/
│   ├── main.ts               # 入口
│   ├── style.css             # 全局样式
│   ├── components/           # 视图组件
│   ├── analytics/            # 分析逻辑
│   └── viz/                  # D3 图表
├── public/
└── .github/workflows/
    └── daily.yml
```

## 🔌 别人的歌单

访问 `https://<your-page>.github.io/music-viz/?id=<playlist_id>` 即可。
（要求：对方的歌单是公开的。）

## 📝 Changelog

见 [CHANGELOG.md](./CHANGELOG.md)。

## 💌

Music is the shorthand of emotion. — Leo Tolstoy