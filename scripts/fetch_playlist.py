#!/usr/bin/env python3
"""
抓取网易云公开歌单 → 写到 data/latest.json + data/snapshots/<date>.json
并更新 data/manifest.json

零第三方依赖，纯 Python 标准库。
支持任意公开歌单 ID（URL 参数传入或环境变量 NCM_PLAYLIST_ID）。
"""
from __future__ import annotations
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SNAP_DIR = DATA_DIR / "snapshots"
SNAP_DIR.mkdir(parents=True, exist_ok=True)

PLAYLIST_ID = os.environ.get("NCM_PLAYLIST_ID", "710883180")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
HEADERS = {
    "User-Agent": UA,
    "Referer": "https://music.163.com/",
    "Accept": "application/json",
}


def http_json(url: str, method: str = "GET", data: bytes | None = None,
    timeout: int = 20) -> dict:
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read()
    return json.loads(body.decode("utf-8"))


def fetch_playlist(pid: str) -> dict:
    """POST /api/v6/playlist/detail -> {playlist, code}"""
    body = f"id={pid}".encode()
    j = http_json("https://music.163.com/api/v6/playlist/detail", method="POST", data=body)
    if j.get("code") != 200 or "playlist" not in j:
        raise RuntimeError(f"playlist/detail failed: {j}")
    return j["playlist"]


def fetch_songs_detail(ids: list[int]) -> list[dict]:
    """GET /api/song/detail?ids=[id1,id2,...] (支持大列表)"""
    all_songs: list[dict] = []
    bs = 200
    for i in range(0, len(ids), bs):
        batch = ids[i:i + bs]
        ids_param = urllib.parse.quote(json.dumps(batch))
        url = f"https://music.163.com/api/song/detail?ids={ids_param}"
        j = http_json(url)
        songs = j.get("songs") or []
        all_songs.extend(songs)
        print(f"  songs batch {i // bs}: {len(songs)}")
        time.sleep(0.3)
    return all_songs


def normalize(song: dict) -> dict:
    artists = song.get("artists") or []
    album = song.get("album") or {}
    pt = song.get("publishTime") or 0
    publish_year = dt.datetime.fromtimestamp(pt / 1000, dt.timezone.utc).year if pt else None
    duration_sec = (song.get("duration") or 0) // 1000
    return {
        "id": song.get("id"),
        "name": song.get("name"),
        "artists": [{"id": a["id"], "name": a["name"]} for a in artists],
        "album": {
            "id": album.get("id"),
            "name": album.get("name"),
            "picUrl": album.get("picUrl"),
        },
        "durationSec": duration_sec,
        "publishYear": publish_year,
        "publishTime": pt,
        "popularity": song.get("popularity", 0),
        "fee": song.get("fee", 0),  # 0 免费 1 专辑 8 低质
        "status": song.get("status", 0),
    }


def build_snapshot(pid: str) -> dict:
    print(f"[fetch] playlist id={pid}")
    pl = fetch_playlist(pid)
    track_ids = [t["id"] for t in pl.get("trackIds", [])]
    print(f"[fetch] trackIds: {len(track_ids)}")
    if not track_ids:
        raise RuntimeError("no tracks")

    songs_raw = fetch_songs_detail(track_ids)
    songs = [normalize(s) for s in songs_raw]

    now = dt.datetime.now(dt.timezone.utc)
    snap = {
        "version": 1,
        "playlistId": pid,
        "playlist": {
            "id": pl.get("id"),
            "name": pl.get("name"),
            "creator": (pl.get("creator") or {}).get("nickname"),
            "cover": (pl.get("creator") or {}).get("avatarUrl")
                or pl.get("coverImgUrl"),
            "coverImgUrl": pl.get("coverImgUrl"),
            "description": pl.get("description"),
            "trackCount": pl.get("trackCount"),
            "playCount": pl.get("playCount"),
            "shareCount": pl.get("shareCount"),
            "subscribedCount": pl.get("subscribedCount"),
            "createTime": pl.get("createTime"),
            "updateTime": pl.get("updateTime"),
        },
        "tracks": songs,
        "fetchedAt": now.isoformat(),
        "snapshotDate": now.strftime("%Y-%m-%d"),
    }
    return snap


def update_manifest(snap: dict) -> None:
    manifest_path = DATA_DIR / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
    else:
        manifest = {"version": 1, "snapshots": []}
    date = snap["snapshotDate"]
    entries = manifest.get("snapshots", [])
    if not any(e.get("date") == date for e in entries):
        entries.append({
            "date": date,
            "fetchedAt": snap["fetchedAt"],
            "trackCount": len(snap["tracks"]),
        })
    entries.sort(key=lambda e: e["date"], reverse=True)
    manifest["snapshots"] = entries
    manifest["latest"] = date
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))


def main() -> int:
    try:
        snap = build_snapshot(PLAYLIST_ID)
    except Exception as e:
        print(f"[error] {e}", file=sys.stderr)
        return 1

    date = snap["snapshotDate"]
    (SNAP_DIR / f"{date}.json").write_text(
        json.dumps(snap, ensure_ascii=False, indent=2)
    )
    (DATA_DIR / "latest.json").write_text(
        json.dumps(snap, ensure_ascii=False, indent=2)
    )
    update_manifest(snap)
    print(f"[done] snapshot {date}, {len(snap['tracks'])} tracks")
    return 0


if __name__ == "__main__":
    sys.exit(main())