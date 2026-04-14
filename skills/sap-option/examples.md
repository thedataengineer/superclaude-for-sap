# Examples

User: "sap.env 보여줘"
→ parse, display masked table, ask what to change.

User: "블록리스트 minimal 로 바꿔"
→ locate `MCP_BLOCKLIST_PROFILE`, show current, set to `minimal`, preview diff, confirm, write, remind to `/mcp` reconnect.

User: "ACDOCA 화이트리스트에 추가해줘"
→ read `MCP_ALLOW_TABLE`, append `ACDOCA` (dedupe, uppercase), warn about audit logging, confirm, write.

User: "산업 cosmetics로 바꿔줘"
→ route to industry-selection.md, show current (`SAP_INDUSTRY` + `config.json.industry`), set both to `cosmetics`, two-file diff, confirm, atomic write to both, remind that consultants will now load `industry/cosmetics.md`.

User: "업종이 뭐로 되어 있어?"
→ render status snapshot only (Industry line), stop.

User: "SAP_PASSWORD 바꿔줘"
→ prompt for new password (do not echo), validate non-empty, diff shows `*** → ***`, confirm, write backup, remind to reconnect.

User: "hud 주간 한도 200달러로 바꿔"
→ route to hud-limits.md flow, edit `~/.claude/settings.json` → `env.SC4SAP_WEEKLY_LIMIT_USD = 200`, preview diff, confirm, write, remind user to **restart Claude Code** (not just `/mcp`).

User: "5h 한도 35, 주간 200, extra 100"
→ HUD flow, set all three at once, single diff, single confirmation, single write.
