# Multi-Profile Artifact Resolution

When multi-profile mode is active (`<project>/.prism/active-profile.txt` exists), project-local artifacts live under `<project>/.prism/work/<alias>/...` instead of directly under `.prism/`. Skills that read or write artifacts **must** use the resolution rules below to stay correct across profile switches.

## Rules

### Write path — always the active profile

```
<project>/.prism/work/{activeAlias}/<category>/<rest>
```

Categories: `program/`, `cbo/`, `customizations/`, `audit/`, `comparisons/`. Writes NEVER fall back to another profile or to the project root.

Legacy (no active-profile.txt): writes go to `<project>/.prism/<category>/<rest>` exactly as before.

### Read path — current profile first, then fall-through (read-only)

1. Look up `<project>/.prism/work/{activeAlias}/<relative>`.
2. If not found, iterate other profiles in `<project>/.prism/work/*/`. Return the first hit, **annotated** with `ℹ from=<otherAlias> (readonly cross-view)`.
3. Legacy fallback: `<project>/.prism/<relative>`.

Cross-view reads let a QA-active session open a Dev-produced spec without copying it. The annotation is important: the skill must NEVER silently write back to a file it found through cross-view — that would corrupt the source profile. Treat cross-view reads as immutable.

## Skill implementation pattern

Before any `Read` of an artifact path, walk the rules above. Pseudocode:

```
function resolveArtifact(relativePath):
  active = readFile('.prism/active-profile.txt')
  if active:
    primary = '.prism/work/' + active + '/' + relativePath
    if exists(primary): return { path: primary, from: active, crossView: false }
    for alias in listDirs('.prism/work/'):
      if alias == active: continue
      candidate = '.prism/work/' + alias + '/' + relativePath
      if exists(candidate): return { path: candidate, from: alias, crossView: true }
  legacy = '.prism/' + relativePath
  if exists(legacy): return { path: legacy, from: null, crossView: false }
  return null
```

For writes:

```
function writePath(relativePath):
  active = readFile('.prism/active-profile.txt')
  if active: return '.prism/work/' + active + '/' + relativePath
  return '.prism/' + relativePath  // legacy
```

## Affected skills

Skills that read or produce project-local artifacts must adopt this pattern:

- `/prism:create-program` — writes `program/<name>/{platform,interview,spec,plan,report,...}.md`
- `/prism:program-to-spec` — reads existing programs, writes spec.md / spec.xlsx
- `/prism:analyze-code` — writes review report
- `/prism:analyze-cbo-obj` — writes `cbo/<MODULE>/<PACKAGE>/{index,inventory}.md`
- `/prism:compare-programs` — writes `comparisons/*.md`
- `/prism:analyze-symptom` — writes audit reports
- `/prism:create-object` — writes nothing long-term (transient state only)
- Setup / sap-option — manage profile files themselves; outside this pattern

Each affected skill's SKILL.md should explicitly state "uses multi-profile artifact resolution per `common/multi-profile-artifact-resolution.md`" so the LLM picks up the rule at dispatch time.

## Invariants

- **Never** write to `<project>/.prism/` directly when `active-profile.txt` exists — always scope under `work/<alias>/`.
- **Never** write to a cross-view path — cross-view is read-only by definition.
- When surfacing a cross-view read to the user, always show the origin alias. This prevents confusion when QA sees a Dev-authored spec and accidentally edits it with the current-profile context in mind.
- Legacy projects (no active-profile.txt) behave identically to pre-0.6.0 — no breaking change.
