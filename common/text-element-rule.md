# Text Element Rule

**All user-visible text MUST use Text Elements** — no hardcoded display literals.

## Scope

- ALV column caption: `<fs_fieldcat>-coltext = text-f01.`
- Screen title: `text-t01`
- Messages / tooltips: `text-m01`
- Selection screen labels: maintained via Text Element editor

## Enforcement

- `CreateTextElement` MCP registers each text id per program/screen.
- `sap-code-reviewer` **must fail the review** if hardcoded display literals are found.
