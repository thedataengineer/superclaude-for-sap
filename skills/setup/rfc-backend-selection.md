# Step 4bis — RFC backend selection

Referenced by `wizard-steps.md`. Mandatory between Step 4 (SAP connection) and Step 5 (MCP reconnect).

Three MCP operation families (Screen, GUI Status, Text Element) dispatch through RFC-enabled function modules (`ZMCP_ADT_DISPATCH`, `ZMCP_ADT_TEXTPOOL`). Ask the user which transport to use. **One question**:

```
Pick RFC backend for Screen / GUI Status / Text Element ops:
  1) soap    — HTTPS via /sap/bc/soap/rfc (default, no extra install)
               Requires the ICF node /default_host/sap/bc/soap/rfc to be active.
  2) native  — Direct TCP via SAP NW RFC SDK (faster, binary protocol)
               Requires:
                 • SAP NW RFC SDK 7.50+ downloaded from SAP Support Portal
                 • Platform-specific libsapnwrfc.{dll,so,dylib} linkable at runtime
                 • SAPNWRFC_HOME env var OR SDK in system lib path
                 • Build toolchain (MSVC on Windows, gcc/clang on macOS/Linux)
                 • Extra RFC credential block (below) in sap.env
  3) gateway — Remote RFC Gateway middleware via HTTPS/JSON (no SDK on this host)
               Best choice for enterprise deployments where IT ops runs one central
               gateway and developers stay free of SDK install overhead.
               Requires:
                 • An already-running RFC Gateway reachable from this laptop
                 • SAP_RFC_GATEWAY_URL and (optional) SAP_RFC_GATEWAY_TOKEN
                 • SAP_USERNAME / SAP_PASSWORD / SAP_CLIENT are forwarded to the
                   gateway per request (X-SAP-* headers) so the SAP audit log keeps
                   the real developer identity.
  4) odata   — SAP OData v2 service ZMCP_ADT_SRV via HTTPS (pure, no SDK, no middleware)
               Requires:
                 • ZCL_ZMCP_ADT_MPC/DPC/_EXT classes on SAP (installed by Step 9c)
                 • /IWBEP/REG_SERVICE + /IWFND/MAINT_SERVICE registration (Basis)
                 • SAP_RFC_ODATA_SERVICE_URL in sap.env
                 • Reuses SAP_USERNAME/PASSWORD/CLIENT as Basic auth
               Best when company blocks /sap/bc/soap/rfc but allows OData Gateway.
               See `docs/odata-backend.md` for the full setup walkthrough.
```

- Accept `soap` / `native` / `gateway` / `odata` (or 1/2/3/4). Default `soap` if the user presses Enter.
- Write the choice to `sap.env` as `SAP_RFC_BACKEND=soap`, `=native`, `=gateway`, or `=odata`.

## If the user chose `soap`

Run this preflight before Step 5:

1. Tell the user to confirm ICF node `/default_host/sap/bc/soap/rfc` is **active** in SICF (transaction `SICF` → Hierarchy Type `SERVICE` → Execute → navigate to `default_host` → `sap` → `bc` → `soap` → `rfc` → if grey, right-click → Activate Service).
2. Smoke test after `SAP_URL` is set:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -u $SAP_USERNAME:$SAP_PASSWORD \
     "$SAP_URL/sap/bc/soap/rfc?sap-client=$SAP_CLIENT"
   ```
   Expect `405` (POST-only endpoint, 405 on GET proves the node is active). `404` means the ICF node is inactive — halt and instruct the user to activate it.
3. No further env additions; continue to Step 5.

## If the user chose `native`

Collect these additional fields one at a time and append to `sap.env`:

```
# --- Native RFC (only when SAP_RFC_BACKEND=native) ---
SAP_RFC_ASHOST=       # App server host (or omit if using message server)
SAP_RFC_SYSNR=        # System number (e.g., 00)
SAP_RFC_CLIENT=       # Client (usually same as SAP_CLIENT)
SAP_RFC_USER=         # Recommended: dedicated user with S_RFC auth only
SAP_RFC_PASSWD=       # (use a non-display vault if possible)
SAP_RFC_LANG=EN       # Default EN

# Optional — load balancing (use INSTEAD of ASHOST/SYSNR)
# SAP_RFC_MSHOST=
# SAP_RFC_SYSID=
# SAP_RFC_GROUP=PUBLIC
# SAP_RFC_MSSERV=

# Optional — SNC (recommended for production)
# SAP_RFC_SNC_QOP=8
# SAP_RFC_SNC_MYNAME=
# SAP_RFC_SNC_PARTNERNAME=
# SAP_RFC_SNC_LIB=
```

Then run the native preflight before Step 5:

1. Verify `SAPNWRFC_HOME` env var is set **or** `libsapnwrfc` is resolvable from the system loader path. If missing: halt and direct the user to download the SAP NW RFC SDK (SAP Support Portal → SAP Development Tools → SAP NetWeaver RFC SDK 7.50) and set `SAPNWRFC_HOME` to the extracted folder.
2. Trigger an install check — `cd <PLUGIN_ROOT>/vendor/abap-mcp-adt && npm rebuild node-rfc` — and surface the output. On failure (missing build tools, SDK not found, node version mismatch) stop and show the remediation.
3. Verify RFC auth — after the MCP server restarts in Step 5, `/sc4sap:sap-doctor` Layer 6 will run `RFC_PING` + a `ZMCP_ADT_DISPATCH` dry-call. If the user is doing setup offline, tell them to run `/sc4sap:sap-doctor` as soon as connectivity is available.
4. Warn: do NOT put the same ADT user and RFC user credentials in both blocks unless intentional — best practice is a separate RFC user with `S_RFC` (`RFC_NAME = ZMCP_ADT_DISPATCH, ZMCP_ADT_TEXTPOOL, RFC_PING, SYSTEM`) + minimal `S_DEVELOP` for TEXTPOOL INSERT.

## If the user chose `gateway`

Collect the gateway fields one at a time and append to `sap.env`:

```
# --- Gateway RFC (only when SAP_RFC_BACKEND=gateway) ---
SAP_RFC_GATEWAY_URL=          # e.g., https://rfc-gw.company.com:8443  (required)
SAP_RFC_GATEWAY_TOKEN=        # Bearer token issued by the gateway ACL (recommended)
SAP_RFC_GATEWAY_TLS_VERIFY=1  # Set to 0 only for self-signed dev gateways
```

Then run the gateway preflight before Step 5:

1. Health probe — `curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $SAP_RFC_GATEWAY_TOKEN" "$SAP_RFC_GATEWAY_URL/health"` must return `200`. On `404` / `405` / timeouts, halt and direct the user to verify the gateway URL / firewall / DNS.
2. Smoke test of the dispatch endpoint — a harmless `POST /rfc/dispatch` with `{"action":"PING","params":{}}` and the user's X-SAP-* headers. The gateway must reply with JSON `{subrc,...}`. Non-JSON / 5xx means the gateway mis-implements the contract — halt and link the user to the middleware spec.
3. Tell the user: their `SAP_USERNAME` / `SAP_PASSWORD` / `SAP_CLIENT` / `SAP_LANGUAGE` (already captured earlier in Step 4) will be forwarded to the gateway as `X-SAP-User` / `X-SAP-Password` / `X-SAP-Client` / `X-SAP-Language` headers on every call — the gateway uses them to open a per-developer RFC session so SAP's audit log identifies the real user, not a shared service account. No separate RFC user is needed on this host.

## If the user chose `odata`

Collect the OData fields one at a time and append to `sap.env`:

```
# --- OData RFC (only when SAP_RFC_BACKEND=odata) ---
SAP_RFC_ODATA_SERVICE_URL=    # e.g. https://sap.company.com:44300/sap/opu/odata/sap/ZMCP_ADT_SRV  (required)
SAP_RFC_ODATA_CSRF_TTL_SEC=600  # CSRF token cache TTL in seconds, min 60
```

Then run the OData preflight before Step 5:

1. Verify `ZCL_ZMCP_ADT_MPC_EXT` + `ZCL_ZMCP_ADT_DPC_EXT` exist on the SAP backend (installed by `odata-classes-install.md` — Step 9c). If missing, run Step 9c first.
2. Metadata probe:
   ```bash
   curl -sSu $SAP_USERNAME:$SAP_PASSWORD \
     "$SAP_RFC_ODATA_SERVICE_URL/\$metadata?sap-client=$SAP_CLIENT"
   ```
   Must return HTTP 200 with XML containing `ComplexType Name="DispatchResult"` and `FunctionImport Name="Dispatch"`. If 404, the service is not yet registered — go to Step 9c + the manual registration path in `docs/odata-backend.md`.
3. Tell the user: their `SAP_USERNAME` / `SAP_PASSWORD` are reused as Basic auth, `SAP_CLIENT` is appended as `?sap-client=<n>`. The client handles CSRF handshake automatically (GET `$metadata` with `X-CSRF-Token: Fetch` → cache token + cookie → use on POSTs).
4. **IMPORTANT** — if the metadata probe returns 200 but POST FunctionImport calls return 500 "unknown internal server error", the backend `/IWBEP` service registration is missing. Run `/sc4sap:sap-doctor` Layer 6.odata for diagnosis, then follow the "Basis Team Request" template in `docs/odata-backend.md` — normal `/IWFND/MAINT_SERVICE` "Add Service" does not always populate the backend `/IWBEP` tables in all SAP releases; the standard fix is `/IWBEP/REG_SERVICE` which typically requires Basis authorization.
