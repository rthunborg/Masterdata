#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const policyDir = dirname(fileURLToPath(import.meta.url));
const githubDir = resolve(policyDir, '..');
const rootDir = resolve(githubDir, '..');
const configPath = resolve(githubDir, 'branch-protection.json');
const args = process.argv.slice(2);

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function hasFlag(name) {
  return args.includes(name);
}

function shouldApplyRepositorySettings() {
  return !hasFlag('--protection-only');
}

function shouldApplyBranchProtections() {
  return !hasFlag('--repository-only');
}

function toGitHubRepositoryConfig(repositorySettings) {
  if (!repositorySettings) return null;

  return {
    default_branch: repositorySettings.defaultBranch,
  };
}

function toGitHubReviewConfig(reviewConfig) {
  if (!reviewConfig) return null;

  return {
    dismiss_stale_reviews: reviewConfig.dismissStaleReviews,
    require_code_owner_reviews: reviewConfig.requireCodeOwnerReviews,
    require_last_push_approval: reviewConfig.requireLastPushApproval,
    required_approving_review_count: reviewConfig.requiredApprovingReviewCount,
  };
}

function toGitHubProtectionConfig(defaults, branchConfig) {
  const merged = {
    ...defaults,
    ...branchConfig,
    requiredPullRequestReviews: {
      ...defaults.requiredPullRequestReviews,
      ...branchConfig.requiredPullRequestReviews,
    },
  };

  return {
    required_status_checks: {
      strict: merged.requireBranchesUpToDate,
      contexts: merged.requiredStatusChecks,
    },
    enforce_admins: merged.enforceAdmins,
    required_pull_request_reviews: toGitHubReviewConfig(
      merged.requiredPullRequestReviews
    ),
    restrictions: merged.restrictions,
    required_linear_history: merged.requiredLinearHistory,
    allow_force_pushes: merged.allowForcePushes,
    allow_deletions: merged.allowDeletions,
    block_creations: merged.blockCreations,
    required_conversation_resolution: merged.requiredConversationResolution,
    lock_branch: merged.lockBranch,
    allow_fork_syncing: merged.allowForkSyncing,
  };
}

function runGhRepoUpdate(repository, body) {
  return spawnSync(
    'gh',
    [
      'api',
      '--method',
      'PATCH',
      `repos/${repository}`,
      '--header',
      'Accept: application/vnd.github+json',
      '--header',
      'X-GitHub-Api-Version: 2022-11-28',
      '--input',
      '-',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
      input: JSON.stringify(body),
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );
}

function runGhApi(repository, branchName, body) {
  return spawnSync(
    'gh',
    [
      'api',
      '--method',
      'PUT',
      `repos/${repository}/branches/${branchName}/protection`,
      '--header',
      'Accept: application/vnd.github+json',
      '--header',
      'X-GitHub-Api-Version: 2022-11-28',
      '--input',
      '-',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
      input: JSON.stringify(body),
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const repository = getArgValue('--repo') ?? config.repository;
const dryRun = hasFlag('--dry-run');

if (!repository) {
  throw new Error(
    'Missing repository. Set repository in .github/branch-protection.json or pass --repo owner/name.'
  );
}

const repositoryConfig = toGitHubRepositoryConfig(config.repositorySettings);
if (repositoryConfig && shouldApplyRepositorySettings()) {
  if (dryRun) {
    console.log(JSON.stringify({ repository, repositoryConfig }, null, 2));
  } else {
    const result = runGhRepoUpdate(repository, repositoryConfig);
    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      console.error(result.stderr.trim());
      process.exit(result.status ?? 1);
    }

    console.log(`Applied repository settings for ${repository}`);
  }
}

if (shouldApplyBranchProtections()) {
  for (const [branchName, branchConfig] of Object.entries(config.branches)) {
    const protectionConfig = toGitHubProtectionConfig(
      config.defaults ?? {},
      branchConfig
    );

    if (dryRun) {
      console.log(
        JSON.stringify(
          { repository, branch: branchName, protectionConfig },
          null,
          2
        )
      );
      continue;
    }

    const result = runGhApi(repository, branchName, protectionConfig);
    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      console.error(result.stderr.trim());
      process.exit(result.status ?? 1);
    }

    console.log(`Applied branch protection for ${repository}:${branchName}`);
  }
}
