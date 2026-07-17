# Baseline CI

`Baseline CI` is the single minimum health check for every Wormholes change.

The stable GitHub check name is:

```text
Required baseline
```

It performs these checks in order:

1. Installs the exact dependency versions from `tests/package-lock.json`.
2. Runs `npm run quality`.
3. Runs `npm run test:unit:core`.
4. Builds one release-shaped ZIP from the exact commit.
5. Extracts and verifies that ZIP.
6. Runs the complete Chromium desktop smoke suite against the extracted artifact.
7. Verifies that the tested ZIP did not change.

## Merge protection

Wormholes includes a repository-ruleset installer that requires both stable checks on the default branch:

```text
Required baseline
Required security
```

To apply it, add a repository secret named `WORMHOLES_REPOSITORY_ADMIN_TOKEN`. The token must have repository **Administration: write** permission. Then manually run the **Configure required repository checks** workflow and enter `APPLY`. The workflow creates or updates the active `Wormholes required checks` ruleset for the default branch.

Repository rules are server-side settings. The installer must be run by a repository administrator after the workflow has appeared in GitHub.

## Release protection

The release workflow enforces the same gate in source control. Its `release-artifact` job contains:

```yaml
needs: baseline-ci
```

The release job cannot build or publish a release when the reusable baseline workflow fails.
