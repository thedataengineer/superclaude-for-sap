---
name: sc4sap:analyze-symptom
description: Step-by-step root cause analysis for SAP operational errors. Uses MCP to directly inspect dumps, logs, transports, and where-used relations, then narrows hypotheses with minimal user questions and provides SAP Note search keywords.
level: 2
---

# SC4SAP Analyze Symptom

Performs structured root cause analysis for SAP operational incidents by connecting to the live SAP system through MCP. Auto-collects evidence from dumps, system state, recent transports, and code call graphs before asking the user any question.

<Purpose>
sc4sap:analyze-symptom is the first-line triage skill for SAP production incidents. Rather than bombarding the user with questions, it **directly investigates the SAP system through MCP** to gather evidence it can collect on its own. It then asks the user only about gaps that MCP cannot fill, narrows hypotheses to 2–3 categories, and produces SAP Note search keywords plus recommended next actions.
</Purpose>

<Use_When>
- User reports a symptom using words like "error", "dump", "failing", "broken", "not working", "timeout", "slow"
- User has at least one clue: error message, TCode, program name, job name, or affected user/data
- User is unsure which log or transaction to inspect (ST22, SM21, SLG1, SU53, SM13, SM58, WE02, etc.)
- Need to classify whether the issue is custom development vs SAP standard
- Need to trace root cause of an incident that started after a recent transport or patch
</Use_When>

<Do_Not_Use_When>
- Root cause is already identified and only a code fix is needed — use `/sc4sap:ralph`
- Pure static code quality review — use `/sc4sap:analyze-code`
- Need to create a new ABAP object — use `/sc4sap:create-object`
- Conceptual or configuration-guide question — use `/sc4sap:ask` or a module consultant agent
</Do_Not_Use_When>

<Core_Principles>
- **MCP-first**: Before asking the user, investigate the SAP system directly with MCP. Never re-ask what MCP can answer.
- **Evidence over assumption**: Do not speculate. No "probably" statements without supporting MCP or user-provided evidence.
- **Minimal questions**: At most 3 questions per round. Skip any question whose answer is already known via MCP.
- **Hypothesis narrowing**: Reduce candidate causes to 2–3 from the 8-category framework; each must carry a confidence level and a confirmation path.
- **Actionable output**: Every hypothesis must include the next evidence step (another MCP call, a TCode, or an escalation target).
</Core_Principles>

<Analysis_Framework>
All hypotheses must map to one of these 8 root cause categories:

| Category | Typical Symptoms | Key Signals |
|----------|------------------|-------------|
| Master / Input data | Only specific data fails, others succeed | Data values, related master records |
| Authorization | Only specific users fail | SU53, STAUTHTRACE, recent role changes |
| Customizing | Only specific org units affected | SPRO values, recent customizing transports |
| Interface / RFC / Batch | External integration fails | SM58, SMQ1/2, SM37, WE02, BD87 |
| Custom development | Z*/Y* objects in call stack | Recent Z* transports, GetWhereUsed |
| Standard SAP bug | Only standard objects in stack; right after SP upgrade | SAP Note search, kernel/SP level |
| Performance / Locks / DB | Timeouts, increased wait times | ST05, SAT, SM12, SQLM |
| Operational procedure | Step order or prerequisite violated | Month-end, dependency job status |

Every hypothesis presented to the user must declare its **category** explicitly.
</Analysis_Framework>

<Evidence_Collection_Matrix>
Evidence collection strategy — prefer MCP auto-query, fall back to manual TCode guidance:

| Symptom Type | MCP Auto-Query | Manual TCode |
|--------------|----------------|--------------|
| Short dump / runtime error | `RuntimeListDumps`, `RuntimeGetDumpById`, `RuntimeAnalyzeDump` | ST22 |
| Performance / long runtime | `RuntimeRunProgramWithProfiling`, `RuntimeAnalyzeProfilerTrace`, `RuntimeListProfilerTraceFiles` | ST05, SAT, SQLM |
| Suspect program/class logic | `ReadClass`/`ReadProgram`, `GetAbapAST`, `GetAbapSemanticAnalysis`, `GetWhereUsed` | SE80, SE24, SE38 |
| Recent change tracking | `ListTransports`, `GetTransport`, `GetObjectInfo` (Author/Changed-by) | SE09, SE10, SE16 → E070 |
| Enhancement / BAdI | `GetEnhancements`, `GetEnhancementImpl`, `GetEnhancementSpot` | SE18, SE19, SMOD, CMOD |
| System / session info | `GetSession` | /n (status), /o SM04 |
| Table schema (not rows) | `GetTable`, `GetStructure`, `GetView`, `GetDataElement`, `GetDomain` | SE11 |
| Unit test results | `GetUnitTestResult`, `RunUnitTest` | SE80 → test class |
| Authorization error | (MCP not supported) | SU53, STAUTHTRACE |
| Application log | (MCP not supported) | SLG1 |
| System log | (MCP not supported) | SM21 |
| Update error | (MCP not supported) | SM13 |
| RFC / tRFC / qRFC | (MCP not supported) | SM58, SMQ1, SMQ2 |
| Background job | (MCP not supported) | SM37 |
| IDoc | (MCP not supported) | WE02, WE05, BD87 |
| OData / Fiori | (MCP not supported) | /IWFND/ERROR_LOG, /IWBEP/ERROR_LOG |

**Rule**: For any MCP-supported item, never ask the user — query it directly.
</Evidence_Collection_Matrix>

<Workflow_Steps>

**Step 1 — Initial Triage** (auto)
- Extract clues from the user message: error text, message class/number, TCode, program/class name, affected user, timing, dump indicators
- Call `GetSession` to capture system info (SID, client, release, SP, user)
- Structure the extracted clues and proceed to Step 2

**Step 2 — MCP-Driven Auto-Investigation** (auto — primary phase)

Route by available clues and collect evidence before any user question:

1. **Dump suspected** (keywords: runtime error, dump, short dump, ABORT)
   - `RuntimeListDumps` → recent dumps list
   - Candidate dumps → `RuntimeGetDumpById` → `RuntimeAnalyzeDump`
   - Extract program/class/FM names from dump → feed to step 2.3

2. **Recent transport suspected** (user says "suddenly", "was fine yesterday", "after deployment")
   - `ListTransports` → recent released/open TRs (last 7 days priority)
   - Candidate TRs → `GetTransport` → object list
   - Cross-reference with symptom object

3. **Program / class logic analysis**
   - `ReadClass` / `ReadProgram` / `ReadFunctionModule` → source
   - `GetAbapSemanticAnalysis` → detect inactive/type errors
   - `GetWhereUsed` → impact scope
   - `GetObjectInfo` → last changed by, recent modification date

4. **Enhancement / BAdI suspected** (standard TCode exhibiting non-standard behavior)
   - `GetEnhancements` → enhancements attached to program
   - `GetEnhancementImpl` / `GetEnhancementSpot` → implementation details
   - For any Z* implementation, check recent changes via `GetObjectInfo`

5. **Performance suspected** (TIME_OUT, slowness reports)
   - For reproducible programs: `RuntimeRunProgramWithProfiling` → `RuntimeAnalyzeProfilerTrace`
   - Identify bottleneck (DB access / loop / memory)

**Step 3 — Gap Identification**
After MCP investigation, identify remaining gaps:
- MCP-unsupported areas (authorization, application log, IDoc, batch)
- Reproduction conditions, scope of impact, data patterns only the user can confirm

**Step 4 — Minimal User Questions** (max 3 per round)
Ask only the questions that best narrow the hypothesis. Always surface what MCP already confirmed to avoid redundancy:

```
✅ Confirmed via MCP:
  - System: S4H / client 100 / 756
  - 3 recent dumps found (MESSAGE_TYPE_X at line 247)
  - Call stack includes ZCL_SD_ORDER_PROCESSOR (modified 2 days ago)

❓ Need your input:
  1. Does the error occur only for specific sales orgs or company codes?
  2. Any authorization-related popup (e.g., SU53 capture)?
```

Priority order for questions:
1. Exact error text + message class/number (if not yet known)
2. Reproduction conditions (always / intermittent; specific user / data / org)
3. Recent operational changes (transports, roles, kernel) from the user's perspective

**Step 5 — Hypothesis Narrowing**
- Combine MCP evidence and user answers to narrow to 2–3 categories from `<Analysis_Framework>`
- Each hypothesis must include: **category**, **confidence (High / Medium / Low)**, **evidence**, **confirmation path**

**Step 6 — SAP Note Search Strategy**
Provide copy-paste-ready search keywords, ordered from most specific to broadest:
1. Exact error string in quotes + message class + number
2. Dump runtime error name (e.g., `MESSAGE_TYPE_X`, `ASSERTION_FAILED`)
3. Program / class / function module name
4. Component + keyword (e.g., `FI-GL open period short dump`)
5. TCode + symptom keyword

Additional filters: release, SP level, kernel level, component.

**Step 7 — Recommended Actions**
Split recommendations by who can act:
- Immediately actionable: additional MCP queries, local checks
- Requires access: SU53, SM13, STMS, etc.
- Escalation: development team / Basis / module consultant

**Step 8 — Escalation Routing**
After hypothesis confirmation, hand off to the correct follow-up:
- Custom code fix → `/sc4sap:ralph` or sap-debugger agent
- Code quality review → `/sc4sap:analyze-code`
- Module-specific configuration deep-dive → module consultant (`sap-sd-consultant`, `sap-fi-consultant`, etc.)
- Dump reproduction → `RuntimeRunClassWithProfiling` / `RuntimeRunProgramWithProfiling`

</Workflow_Steps>

<Question_Strategy>
**Rule**: max 3 questions per response. Never re-ask what MCP already answered.

Priority when information is missing:
1. Exact error text + message class/number — the strongest SAP Note search key
2. TCode / App / Program / Job where the error occurs
3. Reproduction conditions (always vs intermittent; user/data/org specificity)

Situation-specific follow-ups:
- **Authorization suspected**: Does another user succeed with the same input? Any SU53 capture?
- **Batch suspected**: Does manual execution also fail? Any recent variant change?
- **Interface suspected**: Does SM59 Connection Test succeed? What is the IDoc status code (51/52/53/64)?
- **Custom development suspected**: (First run `ListTransports` + `GetWhereUsed`, then) Does TR candidate X match the timing of the incident?
- **Standard bug suspected**: Release/SP auto-detected via `GetSession`. Does the same symptom reproduce on QAS/DEV?
- **Performance suspected**: How much slower than usual? Which resource saturates first — DB / CPU / memory?
</Question_Strategy>

<Output_Format>

Each analysis round follows this structure:

```
## 📊 Symptom Analysis — Round N

### ✅ Evidence Collected via MCP
- **System**: {SID} / {client} / {release} / {SP} / {user}
- **Findings**:
  - {Finding 1 — MCP tool used}
  - {Finding 2 — MCP tool used}
  - ...

### 🎯 Current Hypotheses (by confidence)
1. **[Category] {Hypothesis summary}** — Confidence: High / Medium / Low
   - Evidence: {MCP findings / user answers}
   - Confirmation: {next verification step}
2. **[Category] ...** — Confidence: ...
3. ...

### ❓ Questions for You (max 3)
1. {Question 1}
2. {Question 2}

### 🔍 SAP Note Search Keywords (priority-ordered)
- "{exact error message}"
- {message class} {message number}
- {program / class name}
- {component} {keyword}

### 👉 Next Steps
- ✅ Can do now: {additional MCP queries / local actions}
- ⏳ After your input: {what requires the user's answers}
- 🚨 Escalation candidates: {target} — reason: {why}
```

In the final round (no open questions), produce a consolidated report with final hypothesis, SAP Note strategy, and recommended action list.
</Output_Format>

<MCP_Tools_Used>

**System / Context**
- `GetSession` — system ID, client, release, SP level, current user

**Dump Analysis**
- `RuntimeListDumps` — recent dumps
- `RuntimeGetDumpById` — specific dump detail
- `RuntimeAnalyzeDump` — automated dump analysis (location, variables, stack)

**Performance Profiling**
- `RuntimeCreateProfilerTraceParameters` — profiler setup
- `RuntimeRunProgramWithProfiling` / `RuntimeRunClassWithProfiling` — reproducible run with profiler
- `RuntimeListProfilerTraceFiles` / `RuntimeGetProfilerTraceData` / `RuntimeAnalyzeProfilerTrace` — trace analysis

**Transport / Change Tracking**
- `ListTransports` — recent transports
- `GetTransport` — objects included in a transport
- `GetObjectInfo` — author, last changed by, modification date

**Code Analysis**
- `ReadClass` / `ReadProgram` / `ReadFunctionModule` / `ReadInterface` — source
- `GetProgFullCode` — full source including includes
- `GetAbapAST` — parse tree
- `GetAbapSemanticAnalysis` — semantic analysis (activation / type errors)
- `GetWhereUsed` — caller graph
- `GetInactiveObjects` — any inactive objects remaining

**Enhancement**
- `GetEnhancements` — enhancements attached to program
- `GetEnhancementImpl` / `GetEnhancementSpot` — implementation and spot detail

**Data Dictionary** (schema only — not row extraction)
- `GetTable` / `GetStructure` / `GetView` / `GetDataElement` / `GetDomain`

**Search**
- `SearchObject` — existence / type check
- `DescribeByList` — batch metadata lookup

</MCP_Tools_Used>

<Common_Pitfalls_To_Avoid>
- ❌ Asking the user for information MCP can retrieve (system info, program source, recent transports)
- ❌ Firing 4+ questions at once
- ❌ Diagnosing a root cause without an error message in hand
- ❌ Skipping `RuntimeListDumps` when a dump is suspected and speculating instead
- ❌ Deflecting with "contact Basis / dev team" without a concrete checklist and evidence
- ❌ Claiming a standard SAP bug before attempting a SAP Note search
- ❌ Blaming recent changes without inspecting transport history via `ListTransports`
- ❌ Listing 4+ hypotheses (narrow to 2–3)
</Common_Pitfalls_To_Avoid>

Task: {{ARGUMENTS}}
