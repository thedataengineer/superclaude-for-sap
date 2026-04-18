# 変更履歴

← [README に戻る](../README.ja.md) · [インストール](INSTALLATION.ja.md) · [機能](FEATURES.ja.md)

sc4sap のすべての注目すべき変更をここに記録しています。完全なリリースノートは [GitHub Releases](https://github.com/babamba2/superclaude-for-sap/releases) を参照。

本プロジェクトは [Semantic Versioning](https://semver.org/) および [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 形式に従います。

---

## [未リリース]

### 追加
- **アクティブモジュール認識** (`common/active-modules.md`) — クロスモジュール統合マトリックス。`SAP_ACTIVE_MODULES` 環境変数 + `config.json` の `activeModules` が `create-program`, `create-object`, `analyze-cbo-obj`, コンサルタントエージェントで統合フィールド提案を駆動。例: MM オブジェクト + PS 有効 → WBS フィールド (`PS_POSID` / `AUFNR`) 自動提案。
- **Fix #3 `handleUpdateDomain.ts`** — ハンドラプロパティ名を `AdtDomain.update()` の snake_case 期待値と一致 (`value_table`, `fixed_values`, `conversion_exit`, `sign_exists`)。以前は silent drop。
- **Fix #4 `core/domain/update.ts`** (mcp-abap-adt-clients) — `<doma:valueTableRef>` 自己閉じケース用に `patchXmlElementAttribute` → `patchXmlBlock`。`adtcore:uri` + `adtcore:type` + `adtcore:name` の完全な属性を生成。

### 変更
- **`handleCreateTable.ts`** — Create 直後に MANDT ベースの transparent table スケルトン (`key mandt : mandt not null`) を自動注入。SAP バックエンドのデフォルト CDS スタイル `key client : abap.clnt` を置換。初回ユーザーは UpdateTable で `ExceptionResourceAlreadyExists` に遭遇しなくなる。
- **`handleUpdateTable.ts`** — `ddl_code` スキーマ description に MANDT 例 + annotation 保持ガイド追加。
- **`rfc-backend-selection.md`** — `odata` / `zrfc` バックエンドの bootstrap 順序ノートを追加 (Step 9c/9d chicken-and-egg を first-time vs re-run シナリオで明示)。

### ドキュメント
- README 分割 — メインページをスリム化 (コア機能 + 作者 + コントリビューター)。インストール / 詳細機能 / 履歴を `docs/INSTALLATION.md` / `docs/FEATURES.md` / `docs/CHANGELOG.md` (本ファイル) に移動。

---

## リリース履歴

以前のリリースは [Git タグ履歴](https://github.com/babamba2/superclaude-for-sap/tags) および [GitHub Releases](https://github.com/babamba2/superclaude-for-sap/releases) を参照。

### バージョン体系

sc4sap は `v{MAJOR}.{MINOR}.{PATCH}` 形式:
- **MAJOR** — スキル API、設定スキーマ、最小 SAP/Claude Code バージョンへの破壊的変更
- **MINOR** — 新しいスキル、新しいエージェント、新しい common 規則、後方互換の機能追加
- **PATCH** — バグ修正、ドキュメントのみの変更、非破壊的リファクタリング

### 互換性

- **Claude Code**: >= 2.x
- **Node.js**: >= 20.0.0
- **SAP**: ECC 6.0 / S/4HANA On-Premise / S/4HANA Cloud (Public & Private)
- **MCP サーバー**: バンドルされた `abap-mcp-adt-powerup` (`/sc4sap:setup` が自動インストール、リリースごとにバージョン固定)

---

← [README に戻る](../README.ja.md)
