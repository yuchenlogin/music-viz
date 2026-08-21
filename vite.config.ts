import { defineConfig } from 'vite'

// GitHub Pages base path - 你部署时的仓库名 (例如 /music-viz/)
// 也可设置环境变量 VITE_BASE 覆盖
const repoName = process.env.VITE_BASE || '/music-viz/'

export default defineConfig({
  base: repoName,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // 把 data/ 也打进 dist，这样 GitHub Pages 能直接访问 latest.json
    publicDir: 'public',
  },
  server: {
    port: 5173,
  },
})