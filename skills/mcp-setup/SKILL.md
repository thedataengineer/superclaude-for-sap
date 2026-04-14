---
name: sc4sap:mcp-setup
description: Guide to install and configure the mcp-abap-adt MCP server for SAP ADT connectivity
level: 2
---

# SC4SAP MCP Setup

Guides you through installing and configuring the `mcp-abap-adt` MCP server, which provides Claude Code with direct connectivity to your SAP system via ABAP Development Tools (ADT) REST APIs.

<Purpose>
The `mcp-abap-adt` MCP server is the bridge between Claude Code and your SAP system. Without it, no SC4SAP skills can read or write ABAP objects. This skill walks you through cloning, configuring, and registering the server so all MCP tools become available.
</Purpose>

<Source>
MCP server repository: https://github.com/babamba2/abap-mcp-adt.git
</Source>

<Prerequisites>
- Node.js 18+ installed
- Access to a SAP system with ADT service enabled (transaction SICF, service `/sap/bc/adt` active)
- SAP user with developer authorizations (S_DEVELOP, S_TRANSPRT)
- Claude Code with MCP support
</Prerequisites>

<Installation_Steps>
1. **Automatic installation (recommended)**
   The MCP server is automatically installed into the plugin's `vendor/abap-mcp-adt/` directory during setup:
   ```bash
   /sc4sap:setup          # full setup wizard (includes MCP install)
   /sc4sap:setup mcp      # MCP install only
   ```
   Or via npm:
   ```bash
   npm run build          # runs tsc + installs abap-mcp-adt into vendor/
   ```
   This clones the repo, runs `npm install`, and builds it. The plugin's `.mcp.json` is pre-configured to launch `bridge/mcp-server.cjs`, which delegates to the vendor-installed server.

2. **Configure SAP connection**
   Create `.sc4sap/sap.env` in the plugin directory with your SAP credentials:
   ```env
   SAP_URL=https://your-sap-host:44300
   SAP_CLIENT=100
   SAP_AUTH_TYPE=basic
   SAP_USERNAME=your-user
   SAP_PASSWORD=your-password
   SAP_LANGUAGE=EN
   SAP_SYSTEM_TYPE=onprem
   TLS_REJECT_UNAUTHORIZED=0
   ```
   - `SAP_URL`: SAP system URL with HTTPS and ICM port (typically 44300 for HTTPS)
   - `SAP_CLIENT`: SAP client number (3 digits, e.g., "100")
   - `SAP_AUTH_TYPE`: `basic` for username/password, `xsuaa` for JWT (OAuth2)
   - `SAP_USERNAME` / `SAP_PASSWORD`: SAP credentials with developer access
   - `SAP_LANGUAGE`: Logon language (EN, DE, etc.)
   - `SAP_SYSTEM_TYPE`: `onprem` for on-premise S/4HANA, `cloud` for BTP
   - `TLS_REJECT_UNAUTHORIZED`: Set to `0` for self-signed certificates (dev only)

   The bridge reads this file automatically on startup. Environment variables take precedence over file values.

3. **Verify the connection**
   After restarting Claude Code (or reconnecting MCP via `/mcp`), run:
   ```
   /sc4sap:sap-doctor
   ```
   Or manually test by calling `GetSession` — it should return your SAP system ID, client, and username.

4. **Update the MCP server**
   To update to the latest version:
   ```bash
   node scripts/build-mcp-server.mjs --update
   ```
</Installation_Steps>

<Troubleshooting>
- **401 Unauthorized**: Check username/password and ensure the user is not locked
- **Connection refused**: Verify the SAP host URL and ICM HTTPS port; check VPN if required
- **ADT service not found**: Activate `/sap/bc/adt` in transaction SICF and ensure ICF is running
- **SSL certificate errors**: Add SAP system certificate to Node.js trust store, or set `"rejectUnauthorized": false` in config (dev only)
- **No tools visible in Claude Code**: Restart Claude Code after editing config; check MCP server logs
</Troubleshooting>

<Security_Notes>
- Never commit `config.json` with credentials to version control
- Use environment variables for credentials in CI/CD environments
- Prefer read-only SAP user for analysis-only workflows
- The MCP server communicates only with your configured SAP host
</Security_Notes>

Task: {{ARGUMENTS}}
