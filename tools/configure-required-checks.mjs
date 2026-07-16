#!/usr/bin/env node
const API_VERSION = "2026-03-10";
const RULESET_NAME = "Wormholes required checks";
const REQUIRED_CONTEXTS = Object.freeze([
  "Baseline CI / Required baseline",
  "Security CI / Required security",
]);

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
}

function fail(message) {
  console.error(`Required-check configuration failed: ${message}`);
  process.exit(1);
}

function repositoryParts(repository) {
  const match = /^([^/]+)\/([^/]+)$/.exec(String(repository || "").trim());
  if (!match) fail("--repository must use OWNER/REPO format");
  return {owner: match[1], repo: match[2]};
}

export function buildRulesetPayload() {
  return {
    name: RULESET_NAME,
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: {ref_name: {include: ["~DEFAULT_BRANCH"], exclude: []}},
    rules: [
      {
        type: "required_status_checks",
        parameters: {
          do_not_enforce_on_create: true,
          strict_required_status_checks_policy: true,
          required_status_checks: REQUIRED_CONTEXTS.map((context) => ({context})),
        },
      },
    ],
  };
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": API_VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const raw = await response.text();
  let body = null;
  if (raw) {
    try { body = JSON.parse(raw); } catch { body = raw; }
  }
  if (!response.ok) {
    const detail = typeof body === "object" && body?.message ? body.message : raw || response.statusText;
    fail(`GitHub API returned ${response.status}: ${detail}`);
  }
  return body;
}

export async function configureRequiredChecks({repository, token, apiBase = "https://api.github.com"}) {
  const {owner, repo} = repositoryParts(repository);
  if (!token) fail("an administration token is required");
  const base = `${apiBase.replace(/\/$/, "")}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/rulesets`;
  const existing = await githubRequest(`${base}?targets=branch&per_page=100`, token);
  const match = Array.isArray(existing) ? existing.find((item) => item?.name === RULESET_NAME) : null;
  const payload = buildRulesetPayload();
  if (match?.id) {
    await githubRequest(`${base}/${match.id}`, token, {method: "PUT", body: JSON.stringify(payload)});
    return {action: "updated", id: match.id, requiredContexts: REQUIRED_CONTEXTS};
  }
  const created = await githubRequest(base, token, {method: "POST", body: JSON.stringify(payload)});
  return {action: "created", id: created?.id ?? null, requiredContexts: REQUIRED_CONTEXTS};
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const repository = valueAfter("--repository") || process.env.GITHUB_REPOSITORY;
  const tokenEnv = valueAfter("--token-env") || "WORMHOLES_REPOSITORY_ADMIN_TOKEN";
  const token = process.env[tokenEnv] || "";
  if (process.argv.includes("--print-payload")) {
    console.log(JSON.stringify(buildRulesetPayload(), null, 2));
  } else {
    const result = await configureRequiredChecks({repository, token});
    console.log(`${result.action === "created" ? "Created" : "Updated"} ${RULESET_NAME}.`);
    console.log(`Required checks: ${result.requiredContexts.join(", ")}`);
  }
}
