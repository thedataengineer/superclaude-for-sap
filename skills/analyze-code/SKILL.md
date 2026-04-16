---
name: sc4sap:analyze-code
description: ABAP code analysis — read via MCP, analyze with sap-code-reviewer, suggest improvements
level: 2
---

# SC4SAP Analyze Code

Reads ABAP source code directly from the connected SAP system via MCP tools, performs deep structural and semantic analysis using the sap-code-reviewer agent, and produces an actionable improvement report.

<Purpose>
sc4sap:analyze-code gives you a comprehensive code review of any ABAP object in your SAP system — without leaving Claude Code. It leverages the AST, semantic analysis, and where-used capabilities of mcp-abap-adt to go beyond surface-level review into actual type safety, performance patterns, and SAP best practice compliance.
</Purpose>

<Use_When>
- User says "analyze", "review code", "check this class", "what's wrong with", "analyze code", or "code review"
- Before releasing a transport, to catch issues early
- When taking over existing ABAP code and wanting to understand its quality
- When optimizing performance of an ABAP program or class
- User wants where-used impact analysis before modifying an object
</Use_When>

<Do_Not_Use_When>
- User wants to modify the code immediately -- use `/sc4sap:ralph` (which includes fix-and-verify)
- Object doesn't exist yet -- use `/sc4sap:create-object`
- User just wants to read the source -- use `ReadClass`, `ReadProgram` etc. directly
</Do_Not_Use_When>

<Companion_Files>
**MANDATORY**: Read the companion files below before executing. Each covers a self-contained section of this skill:

| Companion | Scope |
|-----------|-------|
| [`analysis-dimensions.md`](analysis-dimensions.md) | 9 `common/` rule files to load + 14 evaluation dimensions the sap-code-reviewer agent scores against |
| [`workflow.md`](workflow.md) | 6-step execution flow (Identify → Read → Structural Analysis → Review → Report → Actions) |
| [`output-and-tools.md`](output-and-tools.md) | Report output format + full MCP tool list used by this skill |
</Companion_Files>

<Execution_Summary>
1. Load rule context from `analysis-dimensions.md` (9 `common/` rule files).
2. Follow the 6 steps in `workflow.md`.
3. Emit the report using the format in `output-and-tools.md`.

Do not skip the companion-file reads — the scoring rubric, workflow, and report schema all live there.
</Execution_Summary>

Task: {{ARGUMENTS}}
