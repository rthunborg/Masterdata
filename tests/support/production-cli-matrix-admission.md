# Local synthetic CLI matrix gate

This is a local, synthetic verification gate. It does not start a service,
touch hosted systems, authorize a production action, or read a private record.
A trusted operator must first have a guard-owned Compose resource already active.
The operator must select it from the reviewed Compose admission record for the
declared recipe. The supported guard List response has no configuration digest;
the helper proves current ownership, readiness, selected-container port and
server identity. It does not independently attest the daemon's complete Compose
configuration. Guard and Docker paths are trusted local operator inputs, not an
untrusted executable admission API.

Run the required gate only by constructing a schema-versioned context from the
latest trusted hook in the current PowerShell session and piping it directly to
the command. Do not save the trusted context in a file:

```powershell
$context = [ordered]@{
  schemaVersion = 1
  resourceGuardContext = $resourceGuardContext # exact current hook object
  resourceId = $selectedGuardResourceId
  database = [ordered]@{ port = $localSyntheticPort; password = $localSyntheticPassword }
  source = [ordered]@{
    workspace = $candidateWorkspace
    commit = $candidateCommit
    gitExecutable = $reviewedGitExecutable
    expectedGitSha256 = $reviewedGitSha256
  }
  tools = [ordered]@{
    cli = [ordered]@{ executablePath = $reviewedCliExecutable; sha256 = $reviewedCliSha256 }
    psql = [ordered]@{ executablePath = $reviewedPsqlExecutable; sha256 = $reviewedPsqlSha256 }
  }
  composeRecipePath = $declaredSyntheticComposeRecipe
  guardExecutable = $guard
  dockerExecutable = $reviewedDockerExecutable
  outputDirectory = $newLocalOutputDirectory
}
$context | ConvertTo-Json -Depth 8 -Compress |
  node .\tests\support\production-cli-matrix-gate.mjs --required
```

Every path is absolute. `resourceGuardContext` has exactly `schemaVersion`,
`sessionId`, and `agentId` from the latest trusted hook; `agentId` may be null.
The source commit and every executable hash are reviewed operator pins for the
candidate, not values discovered by the helper. The password is synthetic and
local only. Do not put the context, its password, system identifier, guard
response, or an invented example ID in logs or source control.

The output directory must be outside the source checkout. Native PowerShell
tests run on Windows; non-Windows suite runs explicitly skip that platform
coverage. The required local matrix is still a Windows gate, with no native
skips accepted in its release evidence.

The PowerShell 5.1 helper calls guard `List`, requires one owned active
verified Compose resource, finds its selected `db` container by the guard's
project label, checks the one IPv4 loopback 5432 mapping, and hashes the system
identifier queried inside that container. It writes a local admission file
under the supplied output directory. The recipe SHA-256 is the caller's
declared local fixture-recipe hash; it is not a claim about Docker daemon
configuration identity.

`--required` is mandatory and sets `REQUIRE_STORY_2215_CLI_MATRIX=true` for
the child Vitest process. The integration test fails before the matrix can be
skipped when that flag is true and its admission file is missing. Missing
context, an inactive/unowned resource, an
ambiguous container, a non-loopback mapping, identity mismatch, preparation
failure, a skipped matrix case, or any Vitest failure exits nonzero. Ordinary
`npx vitest run` retains the existing explicit service skip when no admission
is supplied.
