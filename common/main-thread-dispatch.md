# Main-Thread Dispatch Rule — Enforcement of Skill-Declared Model

Companion to [`model-routing-rule.md`](model-routing-rule.md). Where the 0.6.6 release added the **declaration layer** (`model:` in skill frontmatter + per-phase Phase Banner convention), this file specifies the **enforcement layer**: how a skill ensures its declared main-thread model actually runs, even when the user's session is on a larger model.

## Why this rule exists

The session's main-model identity (`[Model: Opus 4.7]`) does not change mid-session per [`model-routing-rule.md`](model-routing-rule.md) § Response Prefix. Without this rule, a skill that declares `model: haiku` still runs on the session's main model (typically Opus) — defeating per-skill cost discipline and producing inconsistent behavior across sessions.

## The rule — when a skill declares `model:` in frontmatter

Every SKILL.md with `model: <target>` in frontmatter MUST include a `<Main_Thread_Dispatch>` block that applies this rule:

1. **Target resolution** — read `model:` from frontmatter. That's the target.
2. **Session identity check** — check the current session's main model (from the system prompt's `[Model: ...]` line).
3. **Dispatch decision**:
   - If session main ≠ target → sub-dispatch (see below)
   - If session main == target → execute inline (no dispatch)
4. **Nested-invocation exception** — if the skill was invoked with a `parent_skill=<name>` argument (i.e. called as a sub-routine from another skill), skip the dispatch check and execute inline. Nested re-dispatch has no benefit and adds latency.

## Sub-dispatch procedure

When dispatch fires:

```
1. Emit phase banner BEFORE the Agent() call (spawn-latency mitigation):
   ▶ phase=0 (bootstrap) · agent=<skill-name>-runner · model=<target>

2. Spawn:
   Agent(
     subagent_type="general-purpose",
     model="<target>",                   # e.g. "haiku" or "sonnet"
     mode="dontAsk",                     # or "acceptEdits" if skill writes files
     name="<skill-name>-runner",         # for SendMessage continuation if interactive
     prompt=<Sub_Agent_Prompt>            # see template below
   )

3. Relay the sub-agent's response verbatim to the user.

4. STOP. Do NOT also execute the skill body inline.
```

### Sub-agent prompt template

```
You are executing the `/sc4sap:<skill-name>` skill body as a sub-dispatched
agent. The main thread has delegated to you because this skill declares
`model: <target>` in its frontmatter and the session's main model is larger.

Execute the skill body by:
  1. Reading <absolute path to SKILL.md> with the Read tool.
  2. Skipping the `<Main_Thread_Dispatch>` block (you are already sub-dispatched).
  3. Applying the skill instructions to the user's arguments below.

DO NOT re-enter the dispatch block. DO NOT spawn another Agent() for the same skill.

User arguments:
<args verbatim>

Current project directory: <cwd>
Active SAP profile: <alias> (from .sc4sap/active-profile.txt)
```

## Mitigation 1 — SendMessage for interactive skills

Skills with multi-turn user Q&A (setup wizard, deep-interview, sap-option profile management, ask-consultant follow-ups) MUST pass `name=<skill-name>-runner` to the Agent() call, so the sub-agent can be kept alive across user turns via `SendMessage({to: "<skill-name>-runner", ...})`.

**Without SendMessage**: each user response triggers a new Agent spawn (cold start, no memory of prior turns) → poor UX.

**With SendMessage**: the sub-agent maintains conversation state. Main thread just relays:

```
main: sub-agent returns with "Which tier? DEV/QA/PRD"
main → user: "Which tier? DEV/QA/PRD"
user → main: "DEV"
main: SendMessage({to: "sap-option-runner", message: "DEV"})
sub-agent: continues from "Which tier?" context with "DEV" as answer
```

Round-trip cost per Q&A turn: ~1-2 seconds. 10-question interview totals ~15-20 seconds — acceptable.

## Mitigation 2 — Phase banner pre-emission

Agent() spawn incurs 5-10 seconds to first token. During that window, the user sees a blank screen. Emit the phase banner **before** calling Agent() so the user knows work has started:

```
▶ phase=0 (bootstrap) · agent=sap-option-runner · model=Haiku 4.5 · spawning…

<Agent() call happens here; 5-10s wait>

[Model: Opus 4.7 · Dispatched: Haiku×1 (sap-option-runner)]
(sub-agent response relayed here)
```

This is a mandatory emission for all sub-dispatched skills — it is the only visible cue during spawn latency.

## Target skills (14 total)

**Haiku target** (7 skills): `ask-consultant`, `sap-doctor`, `sap-option`, `mcp-setup`, `setup`, `deep-interview`, `trust-session`.

**Sonnet target** (7 skills): `create-program`, `create-object`, `team`, `analyze-cbo-obj`, `analyze-code`, `analyze-symptom`, `compare-programs`.

**Excluded**: `program-to-spec` (under separate development), `release` (retained on main session model for CTS-release risk judgment).

See [`../docs/skill-model-architecture.md`](../docs/skill-model-architecture.md) for per-skill rationale.

## Response Prefix interaction

With this rule, the Response Prefix format becomes:

```
[Model: <session-main> · Dispatched: <target>×1 (<skill-name>-runner)]
```

Example — user on Opus session invokes `/sc4sap:sap-option`:

```
[Model: Opus 4.7 · Dispatched: Haiku×1 (sap-option-runner)]
```

Main stays Opus (session identity is immutable). Dispatched line shows where the actual skill work ran. This is consistent with the existing § Response Prefix Convention — no rule change needed.

## Canonical `<Main_Thread_Dispatch>` block for SKILL.md

Every in-scope SKILL.md places this block immediately after the frontmatter, above `<Response_Prefix>`:

```markdown
<Main_Thread_Dispatch>
Apply [`../../common/main-thread-dispatch.md`](../../common/main-thread-dispatch.md)
with **target model = `<target>`** (matches this skill's frontmatter `model:`).

**Nested exception**: if invoked with `parent_skill=<name>` argument,
execute inline — skip sub-dispatch to avoid nested re-dispatch.

**Interactive mitigation**: pass `name="<skill-name>-runner"` to the Agent()
call and use `SendMessage` for subsequent user turns.  *[interactive skills only]*
</Main_Thread_Dispatch>
```

Replace `<target>`, `<skill-name>`, and the interactive-mitigation note per skill. Non-interactive skills (trust-session, sap-doctor read-only mode, mcp-setup docs) may omit the interactive-mitigation paragraph.

## Why not just change the session's main model?

Claude Code's Skill tool does not (and cannot) mutate the parent session's model mid-run. `/model <name>` is a user-driven slash command, not a tool-callable operation. Sub-dispatch is the only mechanism available to skills.

## FAQ

**Q. Doesn't this contradict `model-routing-rule.md:100` ("does NOT change mid-session")?**
No. Session main-model stays constant. This rule delegates the skill's work to a sub-agent running on the target model — the sub-agent is a separate process with its own model. The main thread's model identity is unchanged, which is why the Response Prefix still shows `[Model: <session-main> · Dispatched: ...]`.

**Q. What if dispatch fails (Agent tool unavailable, permission denied)?**
Fall back to inline execution with a one-line warning: `⚠️ Main-thread dispatch to <target> failed — executing inline on <session-main>. Cost will be higher than declared.` Proceed with skill body.

**Q. What about multi-phase skills that already use Agent dispatches per phase?**
They wrap the entire orchestrator in a Sonnet sub-agent, which then dispatches phase agents as before. Net: nested 2-level dispatch for the first phase banner, 3-level for subsequent phase agents. Latency impact ~1-3% on long-running skills (create-program totals 10+ minutes; +5-10s spawn is <2%).
