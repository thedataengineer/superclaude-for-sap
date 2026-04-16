# Workflow Steps

## Step 1 — Identify Object (auto or confirm)
- If object name provided: use directly
- If not provided: ask "Which ABAP object do you want to analyze? (name and type)"
- Verify object exists via `SearchObject`

## Step 2 — Read Source Code (auto)
Read source via appropriate MCP Read* tool:
- Class: `ReadClass` (reads all includes: definitions, implementations, test classes)
- Program: `ReadProgram` + `GetProgFullCode`
- Function Module: `ReadFunctionModule`
- Interface: `ReadInterface`
- CDS View: `ReadView`

## Step 3 — Structural Analysis (auto, parallel)
- `GetAbapAST` — parse tree and structure
- `GetAbapSemanticAnalysis` — type errors and semantic issues
- `GetWhereUsed` — usage scope and impact

## Step 4 — sap-code-reviewer Analysis (auto)
- **Load rule context** (MANDATORY): Read the 9 rule files from `common/` and `configs/common/naming-conventions.md` (see `analysis-dimensions.md`)
- Pass source code + AST + semantic analysis + rule files to sap-code-reviewer agent
- Agent evaluates all dimensions using the loaded rules as the authoritative standard
- Agent produces finding list: severity (Critical / Major / Minor / Info) + location + **rule reference** (e.g., `common/oop-pattern.md §3`) + description + suggested fix

## Step 5 — Report Generation (auto)
- Group findings by severity
- For each finding: line reference, description, suggested improvement with code example
- Summary metrics: total findings by severity, overall quality score (0-10)
- Highlight top 3 most impactful improvements

## Step 6 — Action Options
After report, offer:
- "Fix all Critical and Major findings automatically with `/sc4sap:ralph`"
- "Show me the where-used callers"
- "Explain finding #N in more detail"
- "Save report to `.sc4sap/analysis/{object-name}-{timestamp}.md`"
