<!-- このファイルはプロジェクト固有ルールのみを書く。個人/グローバル AI ルール
（言語・確認スタイル・出力フォーマット等）は各 AI ツールのグローバル設定へ。
fresh public clone でも有効な内容に保つこと。 -->

# worklog-bridge 開発ガイド

## プロジェクト概要

勤怠システムに記録される「申請打刻」と、実際にキーボードを打っていた「実勤務時間」の乖離を埋めるための個人 OSS CLI。PC イベントログ・git commit・SSH 接続・Claude Code セッション・各業務サーバーへのアクセス履歴といった**多源シグナル**をローカルで収集し、実勤務時間を機械的に再構成して Google Sheets に書き出す。残業の根拠データを残すことが本質的な目的。

スコープ: フルリモート前提のローカル CLI（`npx worklog-bridge`）。**個人 VPS には業務データを集約しない**（セキュリティリスク回避）。集計・割増計算・申請書生成も本 CLI で完結（既存 GAS は廃止移植）。

## やらないこと（スコープ外）

- 出社日のオフィス機器ログ収集（全員フルリモート前提）
- 業務サーバーへの SSH 鍵を個人 VPS へ集約する設計（セキュリティリスク）
- 複数の勤怠システムへの汎用対応（特定の勤怠システム前提でクローズドに運用するツール）
- 勤怠システム API による申請打刻の自動入力（対象 API が提供されていないため画面コピペ運用を継承）
- GUI / Electron / 常駐デーモン（タスクスケジューラの日次バッチのみ）
- 多言語 UI（CLI 出力は日本語、コードは英語識別子）
- Excel / Nextcloud 等の他スプレッドシート対応（Google Sheets 専用で開始） <!-- secrets-scan: allow Nextcloud -->

## 技術スタック

| 層 | 技術 | 備考 |
|---|---|---|
| 言語 | TypeScript (Node.js) | Node 20+ 想定 |
| パッケージマネージャ | pnpm | house 標準 |
| 配布 | npm レジストリ（`npx worklog-bridge`） | `reference_cli-distribution.md` 準拠 |
| 出力先 | Google Sheets API（サービスアカウント） | 既存シート構造を継承 |
| 認証保管 | `~/.worklog-bridge/credentials.json` | OSS リポには含めない |
| CI / リリース | GitHub Actions（タグ駆動） | `reference_release-pipeline.md` 準拠 |
| ライセンス | MIT | `LICENSE` |

## ディレクトリ構成

以下は実装後の構成案（未実装）。現時点で実在するのは `README.md` / `LICENSE` / `package.json` / `scripts/`（secrets-scan 一式・hook インストーラ）/ `.github/workflows/secrets-scan.yml` / `docs/local/`（gitignored）のみ。`src/` / `tsconfig.json` / `config.example.toml` / `docs/setup.md` 等・`release.yml` は未作成。

```
worklog-bridge/
├── README.md
├── LICENSE                  # MIT
├── package.json
├── tsconfig.json
├── config.example.toml      # 設定ファイルの雛形（社内固有値は含めない）
├── src/
│   ├── collectors/          # 多源シグナル収集（PC / git / SSH / Claude / 各サーバー）
│   ├── reconstructor/       # 実勤務時間再構成（セッション統合・ギャップ検出）
│   ├── sheets/              # Google Sheets API 書き込み
│   ├── calc/                # 集計・割増計算（旧 GAS から移植）
│   └── claim/               # 超過勤務手当申請書生成（旧 GAS から移植）
├── docs/
│   ├── setup.md
│   ├── mapping-guide.md
│   └── troubleshooting.md
└── .github/workflows/
    └── release.yml
```

詳細設計と決定事項は親 plan（`docs/local/plan_worklog-automation.md`）を参照。

## 主要コマンド

現時点で使えるコマンド（secrets-scan のみ実装済み）:

- 全追跡ファイル scan: `pnpm scan`
- staged のみ scan（block）: `pnpm scan:staged`
- JSON 出力: `pnpm scan:json`

CLI 本体は未実装。実装後に以下を埋める想定:

- 開発: `pnpm dev`
- テスト: `pnpm test`
- 型チェック: `pnpm typecheck`
- ビルド: `pnpm build`
- 配布実行（インストール後）: `npx worklog-bridge collect` / `npx worklog-bridge sync`

## AI 作業共通ルール

ビルド・コミット禁止、secrets-scan 責務（4 層防御の層 1）、plan/bugfix/pending md の作成ルール等の AI 作業共通ルールは、各利用者のグローバル AI 設定に従う（作者環境の例: `~/.claude/CLAUDE.md` および `~/.claude/guides/`）。

## 運用ルール（このプロジェクト固有）

- **社員番号・社内サーバー名・社内プロジェクト名・実 Sheets ID は OSS リポに含めない**。設定ファイル（`~/.worklog-bridge/`）に分離し、`.gitignore` で個人設定を遮断する。サンプル設定（`config.example.toml`）の固有名詞は全て一般化する（「案件A」「ProjectAlpha」等）
- **業務データはローカル CLI 内で完結**させ、個人 VPS や第三者サーバーへ集約しない
- 親 plan と検討プロセスの資料（HTML 4 件・retrospective・handoff）は本リポの `docs/local/` 配下に集約済み（git 追跡対象外）。公開向けドキュメントを書く場合は `docs/` 直下に置く

## secrets-scan (kb-first・4 層防御の原型プロジェクト)

層 1（書く瞬間の自問）の一般責務はグローバル `~/.claude/CLAUDE.md`「公開対象ファイル作成時の secrets-scan 責務」に従う。本リポは 4 層防御の**原型プロジェクト**であり、以下が本リポ固有の実装:

- 手動検証コマンド: `node scripts/secrets-scan.mjs --staged --block`（pnpm 経由は「主要コマンド」の `pnpm scan` 系を参照）。KB の物理位置は `scripts/secrets-scan.mjs` の `KB_ROOT` 設定を参照
- 機械層の配線: husky pre-commit（層 2）/ `.github/workflows/secrets-scan.yml`（層 3）/ release skill 前提チェック（層 4）
- 設計詳細: `docs/local/secrets-scan-design/index.html` / 経緯: `docs/local/incident-public-repo-leak/index.html` / 関連原則: `~/.claude/guides/reference_release-pipeline.md` P10

## 関連ドキュメント

| 項目 | パス |
|---|---|
| ユーザー向け README | `README.md` |
| Codex/他 AI 用入口 | `AGENTS.md` |
| ローカル作業ノート（非公開） | `docs/local/`（存在する場合） |
| 親 plan（本リポ内・非公開） | `docs/local/plan_worklog-automation.md` |
| 次セッション引継ぎ（本リポ内・非公開） | `docs/local/handoff_2026-06-22.md` / `docs/local/handoff_2026-06-22_part2.md` |
| 既存 GAS（移植元・本リポ外） | ローカル個人ドライブ内 GAS（OSS リポには含めない） |
