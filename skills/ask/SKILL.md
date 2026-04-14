---
name: sc4sap:ask
description: Question routing for SAP development — routes to the right expert agent or MCP lookup
level: 1
---

# SC4SAP Ask

Follows OMC `ask` pattern adapted for SAP. Routes SAP questions to the most appropriate expert agent or performs a direct MCP lookup when the answer is in the connected S/4HANA system.

<Purpose>
sc4sap:ask is a process-first advisor that classifies your SAP question and routes it to the right resource: a sap-architect agent for design questions, a direct MCP query for system data, the SAP documentation specialist for API/config questions, or the sap-code-reviewer for code quality questions.
</Purpose>

<Use_When>
- User asks a SAP question and the right tool/agent to answer it is unclear
- User says "ask", "question", "how do I", "what is", "explain", or "look up"
- Question could be answered by the live SAP system (table data, object existence, transport status)
- Question requires SAP architecture expertise
</Use_When>

<Do_Not_Use_When>
- User wants to execute a task (create/modify ABAP objects) -- use ralph or executor
- Question is about plugin configuration -- use `/sc4sap:setup` or `/sc4sap:sap-doctor`
</Do_Not_Use_When>

<Routing_Logic>
Classify the question by type, then route:

**System data questions** (table contents, transport status, object existence):
- Route to direct MCP lookup: `GetTableContents`, `GetTransport`, `SearchObject`, `GetObjectInfo`
- Return the raw data with a brief explanation

**ABAP code questions** (how to write, best practice, syntax):
- Route to `sap-developer` agent with the question as context
- Agent responds with code example and explanation

**Architecture questions** (design pattern, technology choice, package structure):
- Route to `sap-architect` agent
- Agent provides structured recommendation with rationale

**Code review questions** (is this code correct, any issues):
- Route to `sap-code-reviewer` agent
- Provide code via `GetClass`, `GetProgram`, or `ReadClass` first, then review

**Configuration/SPRO questions** (how to configure X in S/4HANA):
- Route to document-specialist with SAP documentation sources
- Fall back to `GetSqlQuery` on SPRO config tables if online docs unavailable
</Routing_Logic>

<Output>
- Direct answer with source (MCP tool used, agent role, or doc source)
- Artifact saved to `.sc4sap/ask/{timestamp}-{topic}.md` when response is substantial
- No raw CLI assembly; no prompt injection of model flags
</Output>

Task: {{ARGUMENTS}}
