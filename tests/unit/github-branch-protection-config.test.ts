import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type BranchProtectionConfig = {
  repository: string;
  repositorySettings: {
    defaultBranch: string;
  };
  branches: Record<string, { requiredStatusChecks: string[] }>;
  promotionRules: Record<
    string,
    {
      allowedHeadBranches: string[];
      requiredStatusCheck: string;
      workflow: string;
    }
  >;
  pullRequestFlow: {
    featureBaseBranch: string;
    productionBaseBranch: string;
    productionHeadBranch: string;
    notes: string[];
  };
};

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), '.github/branch-protection.json'), 'utf8')
) as BranchProtectionConfig;

const promotionWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/main-promotion-source.yml'),
  'utf8'
);

describe('GitHub branch protection config', () => {
  it('keeps main as the repository default branch', () => {
    expect(config.repositorySettings.defaultBranch).toBe('main');
  });

  it('requires the test check on protected branches', () => {
    expect(config.branches.main.requiredStatusChecks).toContain('Run Tests');
    expect(config.branches.staging.requiredStatusChecks).toContain('Run Tests');
  });

  it('requires the main promotion-source check on main only', () => {
    expect(config.branches.main.requiredStatusChecks).toContain(
      'Validate main promotion source'
    );
    expect(config.branches.staging.requiredStatusChecks).not.toContain(
      'Validate main promotion source'
    );
  });

  it('keeps the main promotion rule aligned with the required check', () => {
    expect(config.promotionRules.main).toEqual({
      allowedHeadBranches: ['staging'],
      requiredStatusCheck: 'Validate main promotion source',
      workflow: '.github/workflows/main-promotion-source.yml',
    });
  });

  it('backs the main promotion rule with a workflow check', () => {
    expect(promotionWorkflow).toContain('pull_request:');
    expect(promotionWorkflow).toContain('branches:\n      - main');
    expect(promotionWorkflow).toContain('name: Validate main promotion source');
    expect(promotionWorkflow).toContain('HEAD_REF');
    expect(promotionWorkflow).toContain('"$HEAD_REF" = "staging"');
    expect(promotionWorkflow).toContain('"$HEAD_REPO" = "$BASE_REPO"');
  });

  it('documents the intended pull request flow', () => {
    expect(config.pullRequestFlow).toMatchObject({
      featureBaseBranch: 'staging',
      productionBaseBranch: 'main',
      productionHeadBranch: 'staging',
    });
    expect(config.pullRequestFlow.notes.join(' ')).toContain(
      'does not expose a separate repository setting'
    );
  });
});
