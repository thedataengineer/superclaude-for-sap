[English](README.md) | [한국어](README.ko.md) | 日本語

# SuperClaude for SAP (sc4sap)

> SAP ABAP 開発のための Claude Code プラグイン — SAP ECC / S/4HANA On-Premise / S/4HANA Cloud (Public & Private) 対応

[![npm version](https://img.shields.io/badge/npm-v4.11.5-cb3837?logo=npm&logoColor=white)](https://www.npmjs.com/package/superclaude-for-sap)
[![GitHub stars](https://img.shields.io/github/stars/babamba2/superclaude-for-sap?style=flat&color=yellow)](https://github.com/babamba2/superclaude-for-sap)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## sc4sap とは

SuperClaude for SAP は Claude Code をフルスタック SAP 開発アシスタントへと変身させます。[MCP ABAP ADT サーバー](https://github.com/babamba2/abap-mcp-adt-powerup)(150+ ツール)を介して SAP システムに直接接続し、クラス・関数モジュール・レポート・CDS ビューなどの ABAP オブジェクトを生成・参照・更新・削除できます。

## 要件

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-CLI-6B4FBB?logo=anthropic&logoColor=white)
![SAP ECC](https://img.shields.io/badge/SAP-ECC_6.0-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA](https://img.shields.io/badge/SAP-S%2F4HANA_On--Premise-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA Cloud](https://img.shields.io/badge/SAP-S%2F4HANA_Cloud-0FAAFF?logo=sap&logoColor=white)
![MCP ABAP ADT](https://img.shields.io/badge/MCP_ABAP_ADT-自動インストール-FF6600)

| 要件 | 詳細 |
|------|------|
| **Node.js** | >= 20.0.0 |
| **Claude Code** | CLI インストール済み (Max/Pro サブスクリプション または API キー) |
| **SAP システム** | **SAP ECC 6.0** / **S/4HANA On-Premise** / **S/4HANA Cloud (Public & Private)** — ADT 有効化 |

> **MCP サーバー** ([abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)) は `/sc4sap:setup` 実行時に **自動でインストールおよび構成**されます — 手動での事前インストールは不要です。

## インストール

```bash
# マーケットプレイスからインストール
claude plugin install sc4sap

# またはソースからインストール
git clone https://github.com/babamba2/superclaude-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

## セットアップ

```bash
# MCP 接続設定と SPRO コンフィグ生成
/sc4sap:setup
```

実行内容:
1. **MCP ABAP ADT サーバー(`abap-mcp-adt-powerup`) 自動インストール**と接続確認
2. SAP システムから SPRO コンフィグファイルを自動生成
3. フック・エージェントの設定
4. **データ抽出ブロックリストフックのインストール(必須)** — プロファイル(`strict` / `standard` / `minimal` / `custom`)を選択し、Claude Code `settings.json` に `PreToolUse` フックを登録

## 機能

### 24 個の SAP 専門エージェント

| 分類 | エージェント |
|------|-------------|
| **Core (10)** | Analyst, Architect, Code Reviewer, Critic, Debugger, Doc Specialist, Executor, Planner, QA Tester, Writer |
| **Basis (1)** | BC Consultant — システム管理、トランスポート管理、診断 |
| **モジュール (13)** | SD, MM, FI, CO, PP, PM, QM, TR, HCM, WM, TM, Ariba, BW |

### 16 個のスキル

| スキル | 説明 |
|--------|------|
| `sc4sap:setup` | プラグインセットアップ + SPRO コンフィグ自動生成 + ブロックリストフックインストール |
| `sc4sap:autopilot` | 完全自律実行パイプライン |
| `sc4sap:ralph` | SAP 検証付き永続ループ |
| `sc4sap:ralplan` | コンセンサスベースの計画立案 |
| `sc4sap:team` | 並列エージェント協調実行 |
| `sc4sap:teams` | CLI チームランタイム (tmux ベース) |
| `sc4sap:ask` | 適切なエージェントへの質問ルーティング |
| `sc4sap:deep-interview` | ソクラテス式要件ヒアリング |
| `sc4sap:mcp-setup` | MCP ABAP ADT サーバー設定ガイド |
| `sc4sap:sap-option` | `.sc4sap/sap.env` の参照・編集 (認証情報・ブロックリストプロファイル・ホワイトリスト) |
| `sc4sap:sap-doctor` | プラグイン + MCP + SAP 接続診断 |
| `sc4sap:release` | CTS トランスポートリリースワークフロー |
| `sc4sap:create-object` | ABAP オブジェクト生成 (ハイブリッドモード) |
| `sc4sap:program` | ABAP プログラムフルパイプライン — Main+Include、OOP/手続き型、ALV、テスト、4 層エージェント |
| `sc4sap:analyze-code` | ABAP コード解析と改善 |
| `sc4sap:analyze-symptom` | SAP 運用エラーの段階的症状分析 (ダンプ、ログ、SAP Note 候補) |
| `sc4sap:program-to-spec` | ABAP プログラムを機能/技術仕様書 (Markdown / Excel) にリバースエンジニア — ソクラテス式に分析範囲を絞り込む |

### MCP ABAP ADT サーバー — 独自機能

sc4sap は拡張型 ADT MCP サーバー **[abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)**(150+ ツール)上で動作します。一般的な ADT MCP でサポートされる Class / Program / Table / CDS / Function Module の CRUD に加え、**他の MCP サーバーがサポートしない古典的な Dynpro 成果物にも完全な Read / Update / Create カバレッジ**を提供します:

| 成果物 | 参照 | 作成 | 更新 | 削除 | 備考 |
|--------|------|------|------|------|------|
| **Screen (Dynpro)** | `GetScreen`, `ReadScreen`, `GetScreensList` | `CreateScreen` | `UpdateScreen` | `DeleteScreen` | Dynpro ヘッダー + Flow Logic フルラウンドトリップを MCP JSON でやり取り (大文字 `HEADER` / `FLOW_LOGIC` / `LINE` キー) |
| **GUI Status** | `GetGuiStatus`, `ReadGuiStatus`, `GetGuiStatusList` | `CreateGuiStatus` | `UpdateGuiStatus` | `DeleteGuiStatus` | メニューバー、ファンクションキー、アプリケーションツールバーをプログラマティックに生成・編集 |
| **Text Element** | `GetTextElement` | `CreateTextElement` | `UpdateTextElement` | `DeleteTextElement` | Text Symbol、Selection Text、List Heading — Text Element 強制ルールに必須 |
| **Includes** | `GetInclude`, `GetIncludesList` | `CreateInclude` | `UpdateInclude` | `DeleteInclude` | Main+Include 規約で使用 |
| **Local defs/macros/tests/types** | `GetLocalDefinitions`, `GetLocalMacros`, `GetLocalTestClass`, `GetLocalTypes` | — | `UpdateLocalDefinitions`, `UpdateLocalMacros`, `UpdateLocalTestClass`, `UpdateLocalTypes` | `DeleteLocal*` | プログラム内部のローカルセクションを独立して編集 |
| **Metadata Extension (CDS)** | `GetMetadataExtension` | `CreateMetadataExtension` | `UpdateMetadataExtension` | `DeleteMetadataExtension` | CDS 上の Fiori/UI アノテーションレイヤリング |
| **Behavior Definition / Implementation (RAP)** | `Get/Read BehaviorDefinition`, `Get/Read BehaviorImplementation` | `Create*` | `Update*` | `Delete*` | RAP BDEF + BHV フルサイクル |
| **Service Definition / Binding** | `Get/Read ServiceDefinition`, `Get/Read ServiceBinding`, `ListServiceBindingTypes`, `ValidateServiceBinding` | `Create*` | `Update*` | `Delete*` | OData V2/V4 公開および検証 |
| **Enhancements / BAdI** | `GetEnhancements`, `GetEnhancementSpot`, `GetEnhancementImpl` | — | — | — | 拡張ポイントの探索 |
| **ランタイム & プロファイリング** | `RuntimeListDumps`, `RuntimeAnalyzeDump`, `RuntimeGetDumpById`, `RuntimeListProfilerTraceFiles`, `RuntimeGetProfilerTraceData`, `RuntimeAnalyzeProfilerTrace`, `RuntimeCreateProfilerTraceParameters`, `RuntimeRunProgramWithProfiling`, `RuntimeRunClassWithProfiling` | — | — | — | ST22 ダンプ分析 + SAT スタイルのプロファイリングを Claude 内部で実行 |
| **セマンティック / AST** | `GetAbapAST`, `GetAbapSemanticAnalysis`, `GetAbapSystemSymbols`, `GetAdtTypes`, `GetTypeInfo`, `GetWhereUsed` | — | — | — | 単純構文チェック以上の豊富な解析 |
| **Unit Test (ABAP + CDS)** | `GetUnitTest`, `GetUnitTestResult`, `GetUnitTestStatus`, `GetCdsUnitTest`, `GetCdsUnitTestResult`, `GetCdsUnitTestStatus` | `CreateUnitTest`, `CreateCdsUnitTest` | `UpdateUnitTest`, `UpdateCdsUnitTest` | `DeleteUnitTest`, `DeleteCdsUnitTest` | ABAP Unit と CDS テストフレームワークの両方をサポート |
| **トランスポート** | `GetTransport`, `ListTransports` | `CreateTransport` | — | — | トランスポートライフサイクル全体を MCP で |

特に Dynpro / GUI Status / Text Element の CRUD により `sc4sap:program` の **古典 UI パイプライン(ALV + Docking + 選択画面)を AI がエンドツーエンドで完全自動構築**できます — 大多数の ADT MCP サーバーでは実現できないシナリオです。

### 共通規約 (`common/`)

スキルとエージェントが同一基準に従うよう、共通ルールを `common/` フォルダに集約しています:

| ファイル | 内容 |
|----------|------|
| `common/include-structure.md` | Main プログラム + 条件付き Include (t/s/c/a/o/i/e/f/_tst) |
| `common/oop-pattern.md` | 2 クラス OOP 分割 (`LCL_DATA` + `LCL_ALV` + オプション `LCL_EVENT`) |
| `common/alv-rules.md` | Full ALV (CL_GUI_ALV_GRID + Docking) vs SALV + SALV Factory フィールドカタログ |
| `common/text-element-rule.md` | Text Element 強制 — ハードコーディングリテラル禁止 |
| `common/constant-rule.md` | フィールドカタログ以外のマジックリテラルは `CONSTANTS` 必須 |
| `common/procedural-form-naming.md` | ALV 関連の手続き型 FORM は `_{screen_no}` サフィックス |
| `common/naming-conventions.md` | プログラム/Include/LCL/Screen/GUI Status の共通命名 |
| `common/spro-lookup.md` | SPRO 参照優先順位 — ローカルキャッシュ → 静的ドキュメント → MCP |
| `common/data-extraction-policy.md` | ブロック対象テーブルに対するエージェントの拒否プロトコル |

### SAP プラットフォーム認識 (ECC / S4 On-Prem / Cloud)

`sc4sap:program` は全ステップの前に **SAP Version Preflight** を実行します。`.sc4sap/config.json` の `sapVersion`(ECC / S4 On-Prem / S/4HANA Cloud Public / Private)と `abapRelease` を確認し、分岐します:

- **ECC** — RAP/ACDOCA/BP 不可、リリース別の構文制限 (インライン宣言 <740、CDS <750 など)
- **S/4HANA On-Premise** — CDS + AMDP + RAP 優先、Business Partner、ACDOCA ベースの財務
- **S/4HANA Cloud (Public)** — **古典 Dynpro 禁止**。RAP + Fiori Elements / `if_oo_adt_classrun` / SALV-only に自動リダイレクト。禁止構文 + Cloud 代替 API の完全リスト: `skills/program/cloud-abap-constraints.md`
- **S/4HANA Cloud (Private)** — 古典 Dynpro は可能だが警告 + 拡張性優先を推奨

### SPRO コンフィグリファレンス

13 個の SAP モジュール全てに対する組み込みリファレンスデータ:

```
configs/{MODULE}/
  ├── spro.md         # SPRO 設定テーブル/ビュー
  ├── tcodes.md       # トランザクションコード
  ├── bapi.md         # BAPI/FM リファレンス
  ├── tables.md       # 主要テーブル
  ├── enhancements.md # BAdI / User Exit / BTE / VOFM
  └── workflows.md    # 開発ワークフロー
configs/common/       # 共通リファレンス (IDOC、Factory Calendar、DD* テーブル等)
```

**モジュール**: SD, MM, FI, CO, PP, PM, QM, TR, HCM, WM, TM, Ariba, BW

### SPRO ローカルキャッシュ (トークン節約)

`/sc4sap:setup spro` は稼働中の S/4HANA から顧客固有の SPRO カスタマイジングを `.sc4sap/spro-config.json` に抽出します。全 consultant エージェントは `common/spro-lookup.md` の優先順位に従います:

1. **Priority 1 — ローカルキャッシュ** (`.sc4sap/spro-config.json` → `modules.{MODULE}`) — MCP 呼び出しなし
2. **Priority 2 — 静的リファレンス** (`configs/{MODULE}/*.md`)
3. **Priority 3 — リアルタイム MCP クエリ** — ユーザー確認 + トークンコスト警告後のみ

一度抽出しておけば以降の全セッションでトークンを大幅節約できます。

### SAP 特化フック

- **SPRO 自動注入** — Haiku LLM がユーザー入力を分類し、関連モジュールの SPRO コンフィグを自動注入
- **トランスポート検証** — MCP ABAP Create/Update 前にトランスポートの存在確認
- **自動アクティベート** — オブジェクト生成/修正後に ABAP アクティベートを自動トリガー
- **構文チェック** — ABAP エラー発生時にセマンティック解析を自動実行
- **🔒 データ抽出ブロックリスト** — センシティブテーブルの行取得を `PreToolUse` フックで遮断 (下記参照)

### 🔒 データ抽出ブロックリスト

センシティブテーブル(個人情報、認証、給与、銀行、取引財務)の行データが `GetTableContents` / `GetSqlQuery` で抽出されるのを防ぐ必須の多層防御です。sc4sap エージェント呼び出し、ユーザー直接入力、同一セッションの他プラグイン全てに適用されます。

**4 層防御**:

| 層 | 場所 | 役割 |
|----|------|------|
| L1 — エージェント指示文 | `common/data-extraction-policy.md`, consultant agents | ブロック対象参照時にカテゴリ + 理由 + 代替案を案内して拒否 |
| L2 — グローバル指示 | `CLAUDE.md` の "Data Extraction Policy" ブロック | 全 Claude セッション(直接プロンプト含む)にデフォルトロード |
| L3 — Claude Code フック | `scripts/hooks/block-forbidden-tables.mjs` (`PreToolUse`) | MCP 呼び出しをインターセプトし `deny` を返す (プログラマティック遮断) |
| L4 — MCP サーバー (opt-in) | `abap-mcp-adt-powerup` ソース (`src/lib/policy/blocklist.ts`) | 呼び出し主体に関係なく MCP サーバー内部でハード遮断 — `SC4SAP_POLICY=on` 環境変数で有効化 |

**ブロックリストソース**: `exceptions/table_exception.md` — 100+ テーブル/パターン。銀行 (BNKA, KNBK, LFBK, REGUH)、顧客/仕入先マスター PII (KNA1, LFA1, BUT000, BUT0ID)、住所 (ADRC, ADR6, ADRP)、認証 (USR02 パスワードハッシュ, RFCDES, AGR_1251)、HR/給与 (PA* / HRP* / PCL* パターン)、税 ID、保護対象取引データ (VBAK/BKPF/ACDOCA)、監査ログ、カスタム `Z*` PII パターンなど。

**2 つのアクション — `deny` vs `warn`**:

- **`deny`** (デフォルト) — 呼び出しが即座にブロックされ、SAP には送信されません。エージェントがカテゴリ・理由・代替案を説明します。
- **`warn`** — 呼び出しは進行しますが、レスポンスの先頭に `⚠️ sc4sap blocklist WARNING` ブロックがテーブル・カテゴリ・推奨代替案と共に付加されます。業務上日常的にアクセスするカテゴリに適しています。

`warn` デフォルトカテゴリ: **Protected Business Data** (VBAK/BKPF/ACDOCA 等) と **Customer-Specific PII Patterns** (`Z*` テーブル)。その他は全て `deny`。1 回の呼び出しに 1 つでも `deny` テーブルが含まれていれば全体がブロックされます(`deny` 優先)。

**プロファイル選択** — `/sc4sap:setup` 時に必ず 1 つ選択:

| プロファイル | ブロック範囲 |
|-------------|-------------|
| `strict` (デフォルト推奨) | PII + 認証 + HR + 取引財務 + 監査ログ + ワークフロー |
| `standard` | PII + 認証 + HR + 取引財務 |
| `minimal` | PII + 認証 + HR + Tax (一般ビジネステーブル許可) |
| `custom` | 組み込みリストを無視、`.sc4sap/blocklist-custom.txt` のみ使用 |

全プロファイルは `.sc4sap/blocklist-extend.txt` (1 行 1 テーブル名/パターン) の追加項目も併せて適用します。

**インストール** — `/sc4sap:setup` が **必須ステップとして自動インストール**します。手動インストール:

```bash
node scripts/install-hooks.mjs            # ユーザーレベル (~/.claude/settings.json)
node scripts/install-hooks.mjs --project  # プロジェクトレベル (.claude/settings.json)
node scripts/install-hooks.mjs --uninstall
```

**検証**:

```bash
echo '{"tool_name":"mcp__abap__GetTableContents","tool_input":{"table":"BNKA"}}' \
  | node scripts/hooks/block-forbidden-tables.mjs
# 期待結果: "permissionDecision":"deny" を含む JSON
```

ブロック対象テーブルでもスキーマ/DDIC メタデータ (`GetTable`, `GetStructure`, `GetView`, `GetDataElement`, `GetDomain`)、存在確認 (`SearchObject`)、`GetSqlQuery` 経由の COUNT/SUM 集計は許可されます。一時的な例外は `.sc4sap/data-access-approval-{YYYYMMDD}.md` で文書化します。

**L4 サーバーサイド強制** (直接 JSON-RPC、他の LLM、外部スクリプト等あらゆる呼び出し元を遮断):

```bash
# mcp-abap-adt-powerup 起動時に環境変数で有効化
export SC4SAP_POLICY=on                    # または strict | standard | minimal | custom
export SC4SAP_POLICY_PROFILE=strict        # 任意 (SC4SAP_POLICY=on 時のデフォルト)
export SC4SAP_BLOCKLIST_PATH=/path/to/sc4sap/exceptions/table_exception.md  # 任意 (追加リスト)
export SC4SAP_ALLOW_TABLE=TAB1,TAB2        # セッション限定の緊急例外 (ログ記録)
```

ブロック対象テーブル呼び出し時、MCP サーバーは `isError: true` とカテゴリ別の理由を返し、SAP システムへはリクエストが送信されません。

## スキル別サンプル & ワークフロー

各スキルの 1 行呼び出しサンプル、実際のプロンプト例、内部動作フローを整理しました。スクリーンショットは今後のアップデートで追加予定です。

### `/sc4sap:setup`

初回オンボーディング: MCP ABAP ADT サーバーインストール、SPRO キャッシュ抽出、データ抽出ブロックリストフックインストール。

```
/sc4sap:setup
```

**フロー** — 接続テスト → SAP バージョン自動検出 (ECC / S4 On-Prem / Cloud) → モジュール別 SPRO 抽出 → ブロックプロファイル選択 (`strict` / `standard` / `minimal` / `custom`) → `settings.json` にフック登録。

> _スクリーンショットプレースホルダー — セットアップウィザード_

---

### `/sc4sap:create-object`

ハイブリッドモードの単一オブジェクト生成: トランスポート + パッケージを対話的に確認してから、生成・スキャフォールド・アクティベートを実行。

```
/sc4sap:create-object
→ "ZCL_SD_ORDER_VALIDATOR クラスを ZSD_ORDER パッケージに作成して"
```

**フロー** — 型推論 (Class / Interface / Program / FM / Table / Structure / Data Element / Domain / CDS / Service Def / Service Binding) → パッケージ・トランスポート確認 → MCP `Create*` → 初期実装作成 → `GetAbapSemanticAnalysis` → アクティベート。

> _スクリーンショットプレースホルダー — 生成確認とアクティベート_

---

### `/sc4sap:program`

Main + Include 構造、OOP/手続き型、完全な ALV + Dynpro をサポートする旗艦プログラム生成パイプライン。

```
/sc4sap:program
→ "未処理販売オーダーの ALV レポート、選択画面は営業組織 + 日付範囲で"
```

**フロー** — SAP バージョン Preflight (`.sc4sap/config.json`) → ソクラテス式インタビュー → プランナーのスペック → ユーザー確認 → executor が Main プログラム + 条件付き Include (t/s/c/a/o/i/e/f/_tst) + Screen + GUI Status + Text Element を作成 → qa-tester が ABAP Unit 作成 → code-reviewer ゲート → アクティベート。プラットフォーム別分岐 (ECC / S4 On-Prem / Cloud Public は古典 Dynpro 禁止 → `if_oo_adt_classrun` / SALV / RAP に自動リダイレクト)。

> _スクリーンショットプレースホルダー — ALV 出力付きプログラムパイプライン_

---

### `/sc4sap:analyze-code`

既存 ABAP オブジェクトを MCP で読み込み、`sap-code-reviewer` が Clean ABAP + パフォーマンス + セキュリティ基準でカテゴリ化された findings と修正案を返します。

```
/sc4sap:analyze-code
→ "ZCL_SD_ORDER_VALIDATOR の Clean ABAP 違反と SELECT * をレビュー"
```

**フロー** — `ReadClass` / `GetProgFullCode` → `GetAbapSemanticAnalysis` + `GetWhereUsed` → sap-code-reviewer 解析 → カテゴリ別レポート (Clean ABAP / パフォーマンス / セキュリティ / SAP 標準) → 任意の自動修正ループ。

> _スクリーンショットプレースホルダー — レビュー結果テーブル_

---

### `/sc4sap:analyze-symptom`

ランタイム/運用エラーの段階的調査: ダンプ、ログ、SAP Note 候補。

```
/sc4sap:analyze-symptom
→ "F110 実行中に ZFI_POSTING の 234 行目で MESSAGE_TYPE_X ダンプ"
```

**フロー** — `RuntimeListDumps` / `RuntimeGetDumpById` / `RuntimeAnalyzeDump` → スタックトレース解析 → SAP Note 候補検索 → 根本原因仮説 → 対処オプション (設定 / コード / ユーザー対処)。

> _スクリーンショットプレースホルダー — ダンプ分析と Note 候補_

---

### `/sc4sap:autopilot`

曖昧なアイデアからアクティベート済み・テスト済みの ABAP オブジェクトまでの完全自律パイプライン — `deep-interview` → `ralplan` → エージェントパイプライン → `ralph` ループでクリーンになるまで。

```
/sc4sap:autopilot
→ "カスタム仕入先支払承認ワークフローを作成して"
```

**フロー** — deep-interview でスコープ確定 → ralplan コンセンサスプラン → sap-planner WRICEF 分解 → sap-executor オブジェクト生成 → sap-qa-tester ユニットテスト → sap-code-reviewer ゲート → ralph ループでグリーンになるまでリトライ。

> _スクリーンショットプレースホルダー — オートパイロット進行ストリーム_

---

### `/sc4sap:ralph`

自己修正永続ループ: 構文 Clean + アクティベート成功 + ユニットテスト合格の 3 点セットで終了。「とにかく動くようにして」系タスクに投入。

```
/sc4sap:ralph
→ "ZMM_GR_POSTING と包含 Include のアクティベートエラーを全て解決"
```

**フロー** — 反復: `GetAbapSemanticAnalysis` → エラー特定 → `UpdateProgram` / `UpdateClass` / `UpdateInclude` で修正 → アクティベート → ユニットテスト再実行 → 3 点合格で終了。手動介入または最大反復到達時にキャンセル。

> _スクリーンショットプレースホルダー — ralph 反復ログ_

---

### `/sc4sap:ralplan`

コンセンサスベースのプランニングゲート — 複数エージェントの視点 (analyst / architect / critic) がコーディング前に 1 つのプランに収束。オートパイロットが的外れな物を作る状況を防止。

```
/sc4sap:ralplan
→ "レガシー ZSD_ORDER_RELEASE を RAP ベースのワークフローに再設計するプラン"
```

**フロー** — sap-analyst が要件抽出 → sap-architect が技術設計提案 → sap-critic が反論 → 収束反復 → 承認プランを autopilot / team に引き渡し。

> _スクリーンショットプレースホルダー — ralplan 収束 diff_

---

### `/sc4sap:deep-interview`

コード作成前のソクラテス式要件ヒアリング。隠れた前提、エッジケース、モジュール横断影響を引き出します。

```
/sc4sap:deep-interview
→ "カスタム与信限度チェックが必要"
```

**フロー** — 初期意図 → 階層的質問 (どのモジュール、どのマスター、タイミング、エラー UX、承認者) → 仕様サマリー → ユーザー確認。

> _スクリーンショットプレースホルダー — インタビュー Q&A_

---

### `/sc4sap:team` / `/sc4sap:teams`

並列エージェント協調実行。`team` はネイティブ Claude Code teams (インプロセス)、`teams` は tmux CLI ペイン (プロセスレベル並列)。

```
/sc4sap:team
→ "この WRICEF リストを 4 ワーカーに分けて並列ビルド"
```

**フロー** — 共有タスクリスト → N ワーカーがタスクをピックアップ → 各自 create-object / program / ralph 実行 → トランスポート経由でマージ。

> _スクリーンショットプレースホルダー — tmux ペインビュー / チームダッシュボード_

---

### `/sc4sap:release`

CTS トランスポートリリースワークフロー — リスト、検証 (非アクティブオブジェクトなし・構文エラーなし)、リリース、次システムへのインポート確認。

```
/sc4sap:release
→ "DEVK900123 トランスポートをリリース"
```

**フロー** — `GetTransport` → 検証チェックリスト → STMS リリース → インポート状態モニタリング → インポート後スモークチェック。

> _スクリーンショットプレースホルダー — リリースチェックリスト_

---

### `/sc4sap:ask`

フルスキルパイプラインにコミットせず、適切な専門エージェントへ質問のみルーティング。

```
/sc4sap:ask
→ "VA01 Save 後、価格計算後に発火する BAdI は?"
```

**フロー** — 質問分類 (モジュール / 技術 / 設定 / エラー) → マッチする consultant エージェントへルーティング (例: `sap-sd-consultant`) → SPRO キャッシュ + MCP `GetEnhancementSpot` 参照で回答。

> _スクリーンショットプレースホルダー — ルーティング回答_

---

### `/sc4sap:doctor` (エイリアス: `sap-doctor`)

プラグイン + MCP + SAP システム診断。何かおかしい時にまず実行する。

```
/sc4sap:doctor
```

**フロー** — プラグインインストール確認 → MCP サーバーハンドシェイク → SAP RFC/ADT 接続 → SPRO キャッシュ鮮度 → フック登録状態 → ブロックリスト有効化確認 → 対処可能なレポート。

> _スクリーンショットプレースホルダー — ドクターレポート_

---

### `/sc4sap:mcp-setup`

`/sc4sap:setup` が MCP 自動インストールをスキップした場合 (例: 既存のグローバル MCP 設定) `abap-mcp-adt-powerup` を個別インストール・再構成するガイド。

```
/sc4sap:mcp-setup
```

### `/sc4sap:sap-option`

`.sc4sap/sap.env` に記録された値を対話的に参照・編集します。SAP 接続認証情報、TLS 設定、そして行抽出セーフガードとしてのブロックリストポリシーを含みます。画面表示時にパスワード・シークレットは自動でマスキングされ、保存前に Before/After diff をプレビューし `sap.env.bak` バックアップを残します。

```
/sc4sap:sap-option
```

主な用途: `SAP_PASSWORD` ローテーション、`SAP_CLIENT` 変更、`MCP_BLOCKLIST_PROFILE` 切替 (`minimal` / `standard` / `strict` / `off`)、監査ログが残る `MCP_ALLOW_TABLE` 例外テーブル登録、`MCP_BLOCKLIST_EXTEND` にサイト別 Z テーブル追加。保存後は `/mcp` 再接続が必要です。

## テックスタック

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![MCP](https://img.shields.io/badge/MCP_SDK-Protocol-FF6600)

## ロードマップ

- **v0.1.x** (現在) — 24 エージェント、16 スキル、13 モジュールコンフィグ、共通 `common/` 規約、SPRO ローカルキャッシュ、データ抽出ブロックリスト (**L1–L4 全てリリース**; L4 は `abap-mcp-adt-powerup` の `SC4SAP_POLICY=on` 環境変数で opt-in)、Cloud ABAP 認識、RAP スキル
- **v0.2.0** (予定) — `sc4sap:program` OOP テンプレート拡充、L4 デフォルト有効化のためのアップストリーム PR

## Acknowledgments

このプロジェクトは [**oh-my-claudecode**](https://github.com/huryechan/oh-my-claudecode) (**허예찬 / Hur Ye-chan**) プラグインに触発されて制作されました。マルチエージェントオーケストレーションパターン、Socratic deep-interview ゲーティング、ralph/autopilot パイプライン、プラグイン全体の思想、全てがこの作品に由来しています。深く感謝いたします — sc4sap はこの作品なしには今の形では存在しえませんでした。

## 作者

백승현 (Paek Seunghyun)

## ライセンス

[MIT](LICENSE)
