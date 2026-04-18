# インストール & セットアップ

← [README に戻る](../README.ja.md)

## 要件

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-CLI-6B4FBB?logo=anthropic&logoColor=white)
![SAP ECC](https://img.shields.io/badge/SAP-ECC_6.0-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA](https://img.shields.io/badge/SAP-S%2F4HANA_On--Premise-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA Cloud](https://img.shields.io/badge/SAP-S%2F4HANA_Cloud-0FAAFF?logo=sap&logoColor=white)
![MCP ABAP ADT](https://img.shields.io/badge/MCP_ABAP_ADT-Auto--Installed-FF6600)

| 項目 | 詳細 |
|------|------|
| **Node.js** | >= 20.0.0 |
| **Claude Code** | CLI インストール済 (Max/Pro サブスクリプションまたは API キー) |
| **SAP システム** | **SAP ECC 6.0** / **S/4HANA On-Premise** / **S/4HANA Cloud (Public & Private)** — ADT 有効 |

> **MCP サーバー** ([abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)) は `/sc4sap:setup` 中に**自動インストール・設定**されます — 手動の事前インストール不要。

## インストール

> **注** — sc4sap は**まだ公式 Claude Code プラグインマーケットプレイスに登録されていません**。当面はこのリポジトリをカスタムマーケットプレイスとして追加し、プラグインをインストールしてください。

### オプション A — カスタムマーケットプレイスとして追加 (推奨)

Claude Code セッション内で:

```
/plugin marketplace add https://github.com/babamba2/superclaude-for-sap.git
/plugin install sc4sap
```

更新:

```
/plugin marketplace update babamba2/superclaude-for-sap
/plugin install sc4sap
```

### オプション B — ソースからインストール

```bash
git clone https://github.com/babamba2/superclaude-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

その後 Claude Code で `/plugin marketplace add <ローカルパス>` を実行してローカルプラグインディレクトリを指定。

## セットアップ

```bash
# セットアップスキルを実行 — ウィザードが1問ずつ案内
/sc4sap:setup
```

### サブコマンド

```bash
/sc4sap:setup                # フルウィザード (デフォルト)
/sc4sap:setup doctor         # /sc4sap:sap-doctor へルーティング
/sc4sap:setup mcp            # /sc4sap:mcp-setup へルーティング
/sc4sap:setup spro           # SPRO 設定自動抽出のみ
/sc4sap:setup customizations # Z*/Y* 拡張・エクステンションインベントリのみ
```

### ウィザードステップ

ウィザードは**1回に1質問**のみ — 全質問を一度に提示しません。`.sc4sap/sap.env` / `.sc4sap/config.json` の既存値は表示され、Enter で維持可能。

| # | ステップ | 内容 |
|---|---------|------|
| 1 | **バージョンチェック** | Claude Code バージョン互換性検証 |
| 2 | **SAP バージョン + 業界** | `S4` / `ECC` 選択、ABAP リリース入力、15 業界メニューから選択。SPRO テーブル / BAPI / TCode + ABAP 構文ゲーティング + 業界固有構成パターンを駆動 |
| 3 | **MCP サーバーインストール** | `abap-mcp-adt-powerup` を `<PLUGIN_ROOT>/vendor/abap-mcp-adt/` にクローン+ビルド。既にインストール済の場合スキップ (`--update` で更新) |
| 4 | **SAP 接続** | フィールドごとに1質問 — `SAP_URL`, `SAP_CLIENT`, `SAP_AUTH_TYPE`, `SAP_USERNAME`, `SAP_PASSWORD`, `SAP_LANGUAGE`, `SAP_SYSTEM_TYPE`, `SAP_VERSION`, `ABAP_RELEASE`, `SAP_ACTIVE_MODULES` (カンマ区切り), `TLS_REJECT_UNAUTHORIZED`。`.sc4sap/sap.env` に記録 |
| 4bis | **RFC バックエンド選択** | `soap` / `native` / `gateway` / `odata` / `zrfc` から選択 — [RFC バックエンド](FEATURES.ja.md#-rfc-バックエンド選択) 参照 |
| 5 | **MCP 再接続** | 新しくインストールしたサーバー起動のため `/mcp` 実行プロンプト |
| 6 | **接続テスト** | SAP に対する `GetSession` ラウンドトリップ |
| 7 | **システム情報確認** | システム ID、クライアント、ユーザーを表示 |
| 8 | **ADT 権限チェック** | `GetInactiveObjects` で ADT 権限検証 |
| 9 | **`ZMCP_ADT_UTILS` 作成** | 必須ユーティリティ関数グループ (パッケージ `$TMP`)。`ZMCP_ADT_DISPATCH` + `ZMCP_ADT_TEXTPOOL` を作成、RFC 有効化・アクティブ化 |
| 10 | **`config.json` 書き込み** | プラグイン側構成 — `sapVersion`, `abapRelease`, `industry`, `activeModules`, `systemInfo` |
| 11 | **SPRO 抽出 (任意)** | `y/N` — 初回抽出はトークン消費が大きいが、生成される `.sc4sap/spro-config.json` キャッシュは今後のトークン使用量を大幅削減 |
| 11b | **カスタマイズインベントリ (任意)** | `y/N` — 各モジュールの `enhancements.md` をパース後、実際に実装された `Z*`/`Y*` 拡張をライブ SAP で確認。`.sc4sap/customizations/{MODULE}/{enhancements,extensions}.json` に保存 |
| 12 | **🔒 ブロックリストフック (必須)** | プロファイル選択 (`strict`/`standard`/`minimal`/`custom`)、`node scripts/install-hooks.mjs` でインストール、BNKA ペイロードでスモークテスト。成功しなければセットアップ未完了 |

> **2 つのブロックリストレイヤー、個別設定**
> - **L3 (12 ステップ)** — Claude Code `PreToolUse` フック、プロファイルは `.sc4sap/config.json` → `blocklistProfile`。MCP サーバー有無を問わず全セッションに適用
> - **L4 (4 ステップ、任意)** — MCP サーバー内部ガード、プロファイルは `sap.env` → `MCP_BLOCKLIST_PROFILE`。`abap-mcp-adt-powerup` のみに適用
>
> 一般的な組み合わせ: L3 `strict`、L4 `standard`。L3 変更は `/sc4sap:setup` 再実行、L4 は `/sc4sap:sap-option`。

## セットアップ後

- ヘルスチェック: `/sc4sap:sap-doctor`
- 認証情報 / L4 ブロックリスト調整: `/sc4sap:sap-option`
- SPRO 再抽出: `/sc4sap:setup spro`
- アクティブモジュール編集: `/sc4sap:sap-option modules`

---

関連: [機能詳細 →](FEATURES.ja.md) · [変更履歴 →](CHANGELOG.ja.md)
