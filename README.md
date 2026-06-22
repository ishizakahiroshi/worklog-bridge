# worklog-bridge

> Status: 設計フェーズ・実装未着手 (WIP)

Bridge time-clock entries and actual work hours by reconstructing real working time
from local signals (PC / git / SSH / Claude / servers) and writing to Google Sheets.

Local-only CLI. Personal OSS. MIT.

## What it does

「申請打刻」と「実際にキーボードを打っていた時間」の乖離を埋めるための個人 OSS CLI。
PC イベントログ・git commit・SSH 接続・Claude Code セッション・各業務サーバーへのアクセス履歴
といった多源シグナルをローカルで収集し、実勤務時間を機械的に再構成して Google Sheets に書き出す。

残業の根拠データを残すことが本質的な目的。フルリモート前提のローカル CLI として動作し、
業務データを外部サーバーに集約しない設計。

## Status

実装は未着手。現状リポジトリには以下のみ含まれる:

- `CLAUDE.md` / `AGENTS.md` — 開発ガイド
- `scripts/secrets-scan.mjs` — kb 直読 secrets-scan（4 層防御の共通実装）
- `.husky/pre-commit` / `.github/workflows/secrets-scan.yml` — 漏洩防御の hook と CI
- `LICENSE` — MIT

詳細は `CLAUDE.md` を参照。実装着手後に本 README を本格化する。

## License

MIT
