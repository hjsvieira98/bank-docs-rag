# Vulnerability check — 31 October 2026

Draft for a human to validate. Nothing here was merged, and no credentials were rotated.

## Executive summary

Fathom is a Node.js 22 TypeScript monorepo (Hono API, Vite + React UI, LanceDB, Vitest). The first scan found no leaked secrets and no vulnerability that is reachable from the running API. It did find nine advisories: two critical prototype-pollution gadgets in the Vitest 3 worker pool, three high issues in optional `sharp` 0.33.5, and four moderate issues in Vitest's dev server, `@hono/node-server` `serveStatic`, and `minimatch`. None of those nine are in the CISA Known Exploited Vulnerabilities catalog. All nine are closed on this branch, along with the CI and CORS hardening items. `npm run check` (format, lint, types, 44 tests, production build, eval) passed after the changes. npm audit, Trivy, OSV-Scanner, Semgrep, and zizmor are clean on the result.

The runtime on this machine is Node.js v22.23.4, which is the 21 October 2026 security release. That release includes CVE-2026-111497, a Brotli decoder bug that CISA lists as known exploited. The repo previously asked only for Node 22, so an older 22.x install would still be exposed. Engines, `.nvmrc`, and CI now require 22.23.4 or newer.

## Project profile

| Item | Value |
| --- | --- |
| Layout | npm workspaces: `packages/core`, `packages/ingest`, `apps/api`, `apps/web` |
| Runtime | Node.js `>=22.23.4` after this change (was `>=22`). `.nvmrc` was `22`. No Docker, Kubernetes, Terraform, or other IaC |
| Lockfile | `package-lock.json` (npm lockfileVersion 3). Present before the scan |
| Direct runtime deps | `@lancedb/lancedb` 0.41.0, `unpdf` 1.9.1, `@hono/node-server` 1.19.17 → 2.1.5, `dotenv` 17.4.2, `hono` 4.13.14, `react` 19.3.1, `react-dom` 19.3.1 |
| Direct dev deps | TypeScript 5.9.3, ESLint 9.39.5, Vitest 3.2.7 → 5.0.5, Vite 7.3.7, `@vitejs/plugin-react` 5.2.0, Prettier 3.9.10, `tsx` 4.23.15 |
| Hosted models | OpenAI and Anthropic are called with `fetch`. No `@anthropic-ai/sdk`. `openai` 4.29.2 is an optional dependency of LanceDB and is not imported |
| CI | `.github/workflows/ci.yml` only |
| API exposure | `serve()` binds `127.0.0.1`. The UI calls relative `/api`, proxied by Vite |

SBOM: `syft` 1.55.0, CycloneDX 1.7. Before: 148 components (`security-report/raw/sbom.cdx.json`). After: `security-report/raw/sbom-after.cdx.json`.

Install before the first scan used `npm ci --ignore-scripts`. Packages with install scripts in the original lockfile: `esbuild`, `fsevents` (macOS only), `onnxruntime-node`, `protobufjs`, and `sharp` (the last three come in through LanceDB's optional `@huggingface/transformers`). That is a supply-chain note, not evidence of a malicious package.

## Scores before and after

Triage below is deduplicated (one row per advisory or misconfiguration), not npm's per-package rollup. npm audit reported 18 vulnerable package nodes before (2 critical, 3 high, 13 moderate) because parents such as `eslint`, `vitest`, and `@lancedb/lancedb` inherit a child's advisory. Those 18 nodes are the nine advisories in the P2 rows.

| Priority | Before | After | Closed |
| --- | ---: | ---: | ---: |
| P0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 0 |
| P2 | 9 | 0 | 9 |
| P3 | 6 | 0 | 6 |

Scanner totals on the dependency tree:

| Scanner | Before | After |
| --- | --- | --- |
| npm audit | 18 package nodes (2 critical, 3 high, 13 moderate) | 0 |
| OSV-Scanner 2.7.0 | 9 GHSA ids | 0 (lockfile only; see coverage) |
| Trivy 0.76.1 `fs --include-dev-deps` | 11 package rows (the same advisories, some duplicated on parent and child) | 0 |
| Semgrep 1.183.0 | 2 (both the unpinned Actions tags) | 0 |
| zizmor 1.31.1 | 4 (unpinned checkout, unpinned setup-node, default permissions, `persist-credentials`) | 0 |
| gitleaks 8.30.1, full history | 0 | 0 |
| trufflehog 3.99.7, `--only-verified` | 0 verified | 0 verified |

No dependency CVE from this scan is in CISA KEV (catalog `2026.10.30`, released `2026-10-30T17:02:45.3665Z`, 1766 entries). EPSS figures below are from FIRST on **2026-10-30**.

## P0–P3

P0 would be a known-exploited issue, a live secret, or a critical bug reachable from the API. None of those are open. CVE-2026-111497 is exploited in the wild and is already fixed by the Node.js version this environment is running; the pin below stops an older Node 22 from being the documented runtime.

### P2 — closed

| Advisory | Package before | Why it is P2 here | Fix applied |
| --- | --- | --- | --- |
| [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) / CVE-2026-104848 | `tinypool` 1.1.1 (dev, via Vitest 3.2.7) | Critical gadget: polluted `execArgv` or `env` on worker options becomes a real `worker_threads` option. OSV CVSS v4 `AV:N/AC:L/AT:P/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H`. EPSS 0.00497 (percentile 0.42628). Needs a separate prototype-pollution bug, and the pool is only the test runner. Not imported by the API | Vitest 5.0.5 does not depend on `tinypool`. It is gone from the tree |
| [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) / CVE-2026-104849 | `tinypool` 1.1.1 | Same class, via `pool.run(task, options)` reading `filename` from the prototype. Fixed upstream in 2.1.2. EPSS 0.00485 (percentile 0.41759). Same dev-only reachability | Same Vitest upgrade |
| [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) / CVE-2026-84373 | `@vitest/mocker` 3.2.7 and `vitest` 3.2.7 | Moderate. CVSS 3.1 5.9 `AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N`. EPSS 0.00527 (percentile 0.44643). File read through the Vite HMR socket when the public mocker plugin is mounted. `vitest.config.ts` uses the Node environment and `pool: "forks"`. CI runs `vitest run`, which does not leave a dev server up | `@vitest/mocker` 5.0.5 (fixed in 4.1.11 and in 5.0.0-rc.2) |
| [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) / CVE-2026-112949 | `@vitest/mocker` 3.2.7 | Moderate. CVSS 3.1 4.7 `AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N`. EPSS 0.00336 (percentile 0.27028). Unauthenticated manual mock registration can inject script into the dev server. The advisory says Node test runs do not register these handlers | `@vitest/mocker` 5.0.5 (fixed in 4.1.12 and 5.0.3) |
| [GHSA-rmxm-3fg6-px4f](https://github.com/advisories/GHSA-rmxm-3fg6-px4f) / CVE-2026-118663 | `@hono/node-server` 1.19.17 (production) | Moderate. CVSS 3.1 5.3 `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`. EPSS 0.00353 (percentile 0.28960). `serveStatic` decodes the path a second time and can skip middleware. Published 2026-10-28. This API never imports `serveStatic`; it only uses `serve()` plus JSON and SSE routes | `@hono/node-server` 2.1.5 (fixed in 2.1.3). Peer range still accepts Hono 4.13.14 |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) / CVE-2026-118764 | `minimatch` 3.1.5 (ESLint) and 10.2.6 (`typescript-eslint`) | Moderate dev-only denial of service via glob amplification. OSV CVSS v4 availability impact is low (`VA:L`). Red Hat scores it 7.5 in Trivy. EPSS 0.00291 (percentile 0.21741). Published 2026-10-30. Nothing in the request path calls `minimatch` | npm override `minimatch` 11.0.3 (fixed in 11.0.1). `npm run lint` passed |
| [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) / CVE-2026-114113 | `sharp` 0.33.5 optional, via `@huggingface/transformers` 3.0.2 optional, via LanceDB | High inherited libvips issues CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591. OSV attack vector is local. EPSS of the wrapper CVE is 0.00107. The app imports `@lancedb/lancedb`, not `./embedding/transformers` and not `sharp` | override `sharp` 0.35.5 (fixed in 0.35.0) |
| [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) / CVE-2026-114112 | same `sharp` 0.33.5 | High inherited libheif issues. EPSS 0.00241. Same unused optional path | `sharp` 0.35.5 (fixed in 0.35.4) |
| [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) / CVE-2026-114111 | same `sharp` 0.33.5 | High inherited librsvg CVE-2026-96889 (EPSS 0.00564, the highest of the image CVEs). Published 2026-10-06 | `sharp` 0.35.5 (fixed in 0.35.5) |

Underlying libvips EPSS, same date, all far from KEV: CVE-2026-33327 0.00158, CVE-2026-33328 0.00147, CVE-2026-35590 0.00147, CVE-2026-35591 0.00158.

npm's suggested repairs were not followed when they were downgrades: ESLint to 4.0.0, and `@lancedb/lancedb` to 0.30.0. Both would have moved off maintained versions without fixing the real bug.

### P3 — closed

| Finding | Where | Change |
| --- | --- | --- |
| Mutable Action tags (zizmor high, Semgrep warning) | `actions/checkout@v4`, `actions/setup-node@v4` | Pinned to the commits those `v4` tags point at, which are also the `v4.4.0` tags. Checkout `11d5960a326750d5838078e36cf38b85af677262` (release published 2026-07-20). setup-node `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| Default `GITHUB_TOKEN` permissions (zizmor medium) | `verify` job | Workflow `permissions: contents: read` |
| Checkout keeps git credentials (zizmor medium, low confidence; zizmor labels its autofix unsafe) | checkout step | `persist-credentials: false`. This workflow only installs and checks; it does not push |
| Open CORS | `apps/api/src/app.ts` called `cors()` with Hono's default `origin: "*"` | Middleware removed. The documented UI is same-origin through the Vite proxy (`fetch("/api/...")`). Non-browser clients are unaffected. API tests passed |
| Node floor was any 22.x | `package.json` `engines`, `.nvmrc`, CI `node-version: 22` | Floor is 22.23.4, the patched release. Newer Node 22, 24, and 26 still satisfy `>=22.23.4` |

## News, last 30 days

Every item below was returned by a search or an API during this check. Dates are the source's dates.

1. **Node.js security release, 21 October 2026.** [nodejs.org/en/blog/vulnerability/october-2026-security-releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases). Fixes ship as Node.js v22.23.4, v24.22.1, and v26.12.1. High issues on the 22.x line include CVE-2026-111497 (Brotli decoder out-of-bounds write; the project says it can crash, disclose memory, or run code if the process decompresses attacker-controlled Brotli with `node:zlib`), CVE-2026-105482 (`dns.resolve` NUL truncation), and CVE-2026-106069 (TLS hostname check vs a non-canonical IPv4 literal). CVE-2026-105483 is listed for 26.x and 24.x, not as a 22.x issue, in that post. **CVE-2026-111497 is in CISA KEV**, added 2026-10-27, under the name "Google Brotli Unchecked Return Value Vulnerability". EPSS on 2026-10-30 is 0.82641 (percentile 0.99666). This environment's `node -v` is v22.23.4, so the runtime used for the scan and the test run is the fixed 22.x release. [Qualys, 23 October 2026](https://blog.qualys.com/product-tech/2026/10/23/node-js-patches-brotli-remote-code-execution-flaw-find-vulnerable-runtimes-before-attackers-do). [GovCERT.HK A26-10-37](https://www.govcert.gov.hk/en/alerts_detail.php?id=2126) lists Node.js 22.x before v22.23.4 as affected.
2. **Vite `server.fs.deny` bypass, only version 6.4.4.** [GHSA-8g5g-mxqh-grgj](https://github.com/vitejs/vite/security/advisories/GHSA-8g5g-mxqh-grgj), published 21 October 2026. CVE-2026-118662. Fixed in 6.4.5. EPSS 0.00295 on 2026-10-30. Not in KEV. This repo is on Vite 7.3.7. An OSV query for `vite@7.3.7` returned no vulnerabilities.
3. **React Server Components RCE.** [GHSA-xqc2-xf4c-x3h3](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3), published 14 October 2026, in `react-server-dom-webpack`, `react-server-dom-parcel`, and `react-server-dom-turbopack`. The advisory says apps that do not use a server or a bundler plugin that supports React Server Components are not affected. None of those packages are in the lockfile. An OSV query for `react@19.3.1` returned no vulnerabilities. The related [`@vitejs/plugin-rsc` advisory GHSA-59pf-q495-3c99](https://github.com/vitejs/vite-plugin-react/security/advisories/GHSA-59pf-q495-3c99) (15 October 2026) is also not installed here.
4. **LanceDB Cloud table-name path traversal.** [AI Tamer, 24 October 2026](https://aitamer.news/posts/lancedb-cloud-table-name-path-traversal/), describing GHSA-jw4x-p897-vx6q (advisory date 22 October 2026 in that article). It says npm `@lancedb/lancedb` below 0.40.0 is affected and 0.40.0 is fixed, and that only the remote Cloud client builds those URLs. This repo is on 0.41.0 and calls `lancedb.connect(directory)` for a local table. An OSV query for `@lancedb/lancedb@0.41.0` returned no vulnerabilities. The GitHub advisory page itself timed out when fetched from this environment, so the version range above is from that article, not from a direct read of the advisory JSON.
5. **LanceDB Python embedding metadata.** [AI Tamer, 29 October 2026](https://aitamer.news/posts/lancedb-0-41-0-stops-trusting-embedding-settings-in-table-metadata/), describing GHSA-x8v2-vj73-gfwm. The article says the affected package is Python `lancedb` below 0.41.0 and that the TypeScript built-ins are outside the fix because they do not load remote model code or a configurable endpoint. This repo is the TypeScript client.
6. **OpenAI and Anthropic SDKs.** The app does not depend on either official SDK. OSV returned no vulnerabilities for npm `openai@4.29.2` (still present as a LanceDB optional dependency, loaded only from `@lancedb/lancedb/embedding/openai`, which this code does not import). The npm registry page for `openai` showed 7.47.0 updated 2026-10-31; that page was not an advisory. No malicious release of the official `openai` or `@anthropic-ai/sdk` packages turned up inside this 30-day window. Lookalike malware such as `openai-pr-reviewer` and `anthropic-claude-latest` is older than 30 days and is not installed.
7. **TypeScript.** An OSV query for `typescript@5.9.3` returned no vulnerabilities. The web search for Vite, React, and TypeScript CVEs in October 2026 did not return a TypeScript product advisory.
8. **Hono, Vitest, minimatch, sharp, tinypool.** The October advisories for those packages are the P2 rows above, not extra issues the scanners missed. An OSV query for `hono@4.13.14` returned no vulnerabilities. Hono's own `serveStatic` advisory GHSA-5r4p-p66f-jhc7 is dated 29 September 2026, just outside this window, and the installed Hono is 4.13.14.

endoflife.date for Node.js, retrieved 31 October 2026: cycle 22 latest is 22.23.4 (released 2026-10-21), active support ended 2025-10-21, EOL is 2027-04-30, extended support is true. Cycle 26 became LTS on 2026-10-28 (latest listed 26.13.0, EOL 2029-04-30). Staying on patched 22.x through April 2027 is still inside the published maintenance window. Moving to 26 is a choice, not a missing patch.

## What was fixed

Verified with `npm run check` on Node v22.23.4: Prettier, ESLint, `tsc --noEmit`, Vitest 5.0.5 (20 files, 44 tests), `vite build`, and `npm run eval` (retrieval, recall, refusal, fact coverage, and faithfulness all 1.000).

- `@hono/node-server` `^2.1.5` (locked 2.1.5). Closes GHSA-rmxm-3fg6-px4f.
- `vitest` `^5.0.5` (locked 5.0.5) and `@vitest/mocker` 5.0.5. Drops `tinypool` 1.1.1. Closes GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr, GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8.
- Root overrides: `minimatch` 11.0.3, `sharp` 0.35.5, `vite` 7.3.7. The Vite pin keeps Vitest 5 and `apps/web` on one Vite 7.3.7. Without it, npm hoisted Vite 8 beside the app's Vite 7 and `tsc` failed on duplicate plugin types. Closes GHSA-g3hv-75wg-m249 and the three `sharp` GHSAs.
- CI permissions, Action SHA pins, `persist-credentials: false`, Node 22.23.4.
- Removed the default-open CORS middleware.
- README runtime line now matches `engines`.
- `.prettierignore` includes `security-report/` so scan JSON is not reformatted.

Vitest 4.1.12 is also a fixed line, but `npm install` of that version fails on npm 10.9.9 with `Cannot read properties of null (reading 'edgesOut')` while building the Vitest peer set. Vitest 5.0.5 installs. The test file API used here (`describe`, `it`, `expect`, hooks) did not need changes.

The lockfile was regenerated so the overrides actually replaced locked versions. Direct application dependencies other than `@hono/node-server` stayed on the same versions. The other lockfile changes are the Vitest 5 dependency closure and the sharp 0.35.x platform packages.

## What needs a human

- Approve this draft PR. Do not treat it as merged.
- **ESLint.** npm warns that 9.39.5 is no longer supported. Latest on 31 October 2026 is 10.14.0 (published 2026-10-30). ESLint 10.14.0 still depends on `minimatch` `^10.2.6`, which is inside GHSA-g3hv-75wg-m249, so the override has to stay even if ESLint is upgraded. Left in place because it is a major upgrade and the advisory is already closed.
- **TypeScript 7.0.2** is current and has no advisory against 5.9.3. Not upgraded.
- **Vite 8.3.5** is current. `@vitejs/plugin-react` 6.1.2 peers Vite 8. The app stays on Vite 7.3.7, which has a clean OSV result and is what the override enforces. A Vite 8 move is a separate migration.
- **Node 26** (LTS as of 2026-10-28) vs staying on patched 22.x until its 2027-04-30 EOL. LanceDB's own engine range is `>=22`. This branch only raises the floor to 22.23.4.
- **`openai` 4.29.2** remains an unused optional dependency of `@lancedb/lancedb` 0.41.0, which is the latest npm release of that package (2026-10-29). Removing it means forking or waiting on LanceDB. OSV reports no vulnerability for that version.
- **zizmor did not run online audits.** It defaults to offline here, and there was no `GH_TOKEN` in the environment. Tag-pin and permissions findings were still reported and are fixed. Audits that need to fetch Action definitions were not run.
- No secrets were found in git history, so there is nothing to rotate. History was scanned; this check did not rewrite it.

## Secret rotation checklist

None. gitleaks scanned 8 commits and reported no leaks. trufflehog `--only-verified` reported `verified_secrets: 0`. Raw tool output in this folder does not contain secret values. `.env` is gitignored; `.env.example` has empty key placeholders.

## Tools

| Tool | Version | Result |
| --- | --- | --- |
| syft | 1.55.0 | Ran. CycloneDX before and after |
| osv-scanner | 2.7.0 | Ran on the lockfile. The first "after" run also read the *before* SBOM sitting in `security-report/raw/` and repeated old sharp and Hono findings. The saved `osv-scanner-after.json` excludes `security-report` and is clean. `--sbom` is deprecated in this version; the lockfile scan is the one that matches npm and Trivy |
| npm audit | npm 10.9.9 | Ran before and after |
| trivy fs | 0.76.1 | Ran with `--include-dev-deps`. A first pass without that flag hid dev advisories and was replaced |
| trivy config | 0.76.1 | First invocation failed: `unknown flag: --no-progress`. Reran without it. Zero results. This repo has no Dockerfile, Kubernetes, or Terraform for that scanner to judge |
| trivy fs `--scanners misconfig` | 0.76.1 | Ran. No misconfiguration failures. GitHub Actions policy is covered by zizmor, not by this check set |
| semgrep | 1.183.0 | `--config auto` plus `p/owasp-top-ten`, `p/secrets`, `p/typescript`, `p/react`, `p/javascript`. The first attempt with `--metrics=off` failed (`Cannot create auto config when metrics are off`). The saved runs allowed metrics. 270 rules, 83 files |
| gitleaks | 8.30.1 | `detect --log-opts=--all --redact`. 0 findings. Report is `[]` |
| trufflehog | 3.99.7 | `git file://. --only-verified`. 0 verified. Location file is `[]` |
| zizmor | 1.31.1 | Ran offline. Before: 4 findings. After: `[]` |
| endoflife.date | Node.js API | Retrieved 31 October 2026 |
| CISA KEV + FIRST EPSS | catalog 2026.10.30, EPSS date 2026-10-30 | Retrieved. Dependency CVEs not in KEV. CVE-2026-111497 is |

Not run, because this repo has no matching files: pip-audit, govulncheck, cargo audit, bundler-audit, composer audit, dotnet vulnerable list, OWASP dependency-check, bandit, gosec, hadolint, checkov, `trivy image`. No DAST; the playbook says to ask before scanning a running instance.

## Raw outputs

`security-report/raw/`. `*-before` names are `npm-audit-before.json`, `osv-scanner.json`, `sbom.cdx.json`, `semgrep.json`, `trivy-fs.json`, `zizmor.json`. After files use the `-after` suffix except `gitleaks.json` and `trufflehog.json`, which were empty both times.

## Prevention

Dependabot or Renovate on this lockfile, plus `osv-scanner`, `gitleaks`, and `semgrep` in CI. Actions are pinned now; keep new ones pinned to a full SHA. Keep `package-lock.json` committed. When the next Node 22 security release ships, bump `.nvmrc`, `engines`, and the CI `node-version` together.
