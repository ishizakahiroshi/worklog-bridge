# Agent Entry Point (worklog-bridge)

このリポジトリの運用ガイダンスは `CLAUDE.md` を正本とする。

- プロジェクト概要・ルール: `./CLAUDE.md`
- ユーザー向けドキュメント: `./README.md`
- ローカル/プライベート追記（存在する場合・コミットしない）: `./CLAUDE.local.md` / `./AGENTS.local.md` / `./docs/local/`

個人/グローバル AI ルールは意図的にこのリポジトリの外に置く。各 AI ツールの
グローバル設定を使うこと。本ファイルは fresh public clone でも有効に保つ。

## Non-negotiables (full detail in CLAUDE.md)

<!-- TODO: プロジェクト固有の絶対ルールを 2〜4 個。 -->

- 社員番号・社内サーバー名・社内プロジェクト名・実 Sheets ID・認証ファイル（`~/.worklog-bridge/credentials.json` 等）は**絶対にコミットしない**。`.gitignore` と config 分離で防御する
- 業務データはローカル CLI 内で完結させ、個人 VPS や第三者サーバーへ集約しない
- 公開 fixture（テストデータ・サンプル設定・例示プロンプト）は実値ではなく **最初から合成データで書く**（「案件A」「example.com」「A 拠点・B 拠点」等）。動作確認の実値を fixture に化石化しない
- 公開ファイル（README/CLAUDE.md/AGENTS.md/src/**）の新規作成・大改訂時は、**コミット前に外部 KB の各 CSV と family CSV の表示名列で grep し、ヒットがあればマスク or 一般化する**。KB 位置はスクリプト側で `KB_ROOT` env var により設定する（既定値はスクリプト参照）。手で実行する場合は `node scripts/secrets-scan.mjs --staged --block`。husky pre-commit (層 2) が自動で走るが、書く瞬間の自問が一次防御
- 本リポジトリへのコミット・ビルド・公開はユーザー指示があるまで実行しない（house 標準）

ガイダンス間で矛盾が出たら `CLAUDE.md` を優先する。

<!-- many-ai-cli の承認マーカーブロックはここに自動注入される。本ファイルでは持たない。 -->
