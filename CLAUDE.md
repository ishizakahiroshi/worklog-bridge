<!-- このファイルはプロジェクト固有ルールのみを書く。個人/グローバル AI ルール
（言語・確認スタイル・出力フォーマット等）は各 AI ツールのグローバル設定へ。
fresh public clone でも有効な内容に保つこと。 -->

# worklog-bridge 開発ガイド

## プロジェクト概要

<!-- TODO: 1〜2 段落で、このプロジェクトが何で、誰のためのもので、何を解決するかを書く。
README から重複してでも、AI が常時ロードして思考の前提にできる粒度で。 -->

勤怠システムに記録される「申請打刻」と、実際にキーボードを打っていた「実勤務時間」の乖離を埋めるための個人 OSS CLI。PC イベントログ・git commit・SSH 接続・Claude Code セッション・各業務サーバーへのアクセス履歴といった**多源シグナル**をローカルで収集し、実勤務時間を機械的に再構成して Google Sheets に書き出す。残業の根拠データを残すことが本質的な目的。

スコープ: フルリモート前提のローカル CLI（`npx worklog-bridge`）。**個人 VPS には業務データを集約しない**（セキュリティリスク回避）。集計・割増計算・申請書生成も本 CLI で完結（既存 GAS は廃止移植）。

## やらないこと（スコープ外）

<!-- TODO: 「機能追加の打診」を AI から防ぐため、明示的に切り捨てている範囲を列挙する。
例: GUI / exe 化 / 複数 DB 対応 / 自動アップデート / 多言語 UI 等。 -->

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

<!-- TODO: ルート直下の主要フォルダ・ファイルを 1 行解説付きで列挙する。
詳細は別ドキュメントに譲ってよい。 -->

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

<!-- TODO: 開発・テスト・ビルドのよく使うコマンドを 1 行ずつ。 -->

未実装。実装後に以下を埋める想定:

- 開発: `pnpm dev`
- テスト: `pnpm test`
- 型チェック: `pnpm typecheck`
- ビルド: `pnpm build`
- 配布実行（インストール後）: `npx worklog-bridge collect` / `npx worklog-bridge sync`

## 運用ルール（このプロジェクト固有）

グローバル `~/.claude/CLAUDE.md` の規約（md 命名・フッター・ビルド/コミット抑制・承認フォーマット等）に従う。加えて worklog-bridge 固有:

- **社員番号・社内サーバー名・社内プロジェクト名・実 Sheets ID は OSS リポに含めない**。設定ファイル（`~/.worklog-bridge/`）に分離し、`.gitignore` で個人設定を遮断する。サンプル設定（`config.example.toml`）の固有名詞は全て一般化する（「案件A」「ProjectAlpha」等）
- **業務データはローカル CLI 内で完結**させ、個人 VPS や第三者サーバーへ集約しない
- **本リポジトリへのコミット・ビルド・公開はユーザー指示があるまで実行しない**（house 標準）
- 親 plan と検討プロセスの資料（HTML 4 件・retrospective・handoff）は本リポの `docs/local/` 配下に集約済み（git 追跡対象外）。公開向けドキュメントを書く場合は `docs/` 直下に置く

## secrets-scan (kb-first・4 層防御の一次防御)

公開ファイル（`README*` / `CLAUDE.md` / `AGENTS.md` / `src/**` / `dist/**` / packaged tarball）を新規作成・大改訂する瞬間、以下を AI 自身の責務として実行する:

- **親 plan（`docs/local/`・gitignored）からの文言転記時**は、外部 KB の表示名列（`companies.short_name` / `people.name` / `servers.host` / `applications.name`）と family display name を必ず一般化する（「特定の顧客」「ユーザー」「A 拠点」等）。KB の物理位置は `scripts/secrets-scan.mjs` の `KB_ROOT` 設定を参照
- **テスト fixture / 例示 / サンプル**には動作確認の実値を貼らない。最初から合成データで書く（詳細メモリ: `~/.claude/memory/feedback-test-fixtures-must-be-synthetic.md`）
- 不安なら手で `node scripts/secrets-scan.mjs --staged --block` を実行して検証

機械的な層: husky pre-commit (層 2) / GitHub Actions secrets-scan (層 3) / release skill 前提チェック (層 4) が自動で走るが、**書く瞬間の自問が一次防御**。事後 grep は保険であり、層 1 を素通りすると git 履歴に永続化して filter-repo 必要（破壊的）。

設計詳細: `docs/local/secrets-scan-design/index.html` / 経緯: `docs/local/incident-public-repo-leak/index.html` / 関連原則: `~/.claude/guides/reference_release-pipeline.md` P10

## 関連ドキュメント

| 項目 | パス |
|---|---|
| ユーザー向け README | `README.md` |
| Codex/他 AI 用入口 | `AGENTS.md` |
| ローカル作業ノート（非公開） | `docs/local/`（存在する場合） |
| 親 plan（本リポ内・非公開） | `docs/local/plan_worklog-automation.md` |
| 次セッション引継ぎ（本リポ内・非公開） | `docs/local/handoff_2026-06-22.md` |
| 既存 GAS（移植元・本リポ外） | ローカル個人ドライブ内 GAS（OSS リポには含めない） |
