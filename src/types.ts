// 数据类型定义
export interface Artist {
  id: number
  name: string
}

export interface Album {
  id: number
  name: string
  picUrl: string
}

export interface Track {
  id: number
  name: string
  artists: Artist[]
  album: Album
  durationSec: number
  publishYear: number | null
  publishTime: number
  popularity: number
  fee: number
  status: number
}

export interface PlaylistMeta {
  id: number
  name: string
  creator: string
  cover: string
  coverImgUrl: string
  description: string | null
  trackCount: number
  playCount: number
  shareCount: number
  subscribedCount: number
  createTime: number
  updateTime: number
}

export interface Snapshot {
  version: number
  playlistId: string
  playlist: PlaylistMeta
  tracks: Track[]
  fetchedAt: string
  snapshotDate: string
}

export interface SnapshotManifestEntry {
  date: string
  fetchedAt: string
  trackCount: number
}

export interface SnapshotManifest {
  version: number
  latest: string
  snapshots: SnapshotManifestEntry[]
}