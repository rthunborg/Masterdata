import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN environment variable is required.');
  console.error('   Please create a classic Personal Access Token with "repo" scope.');
  process.exit(1);
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

async function getRepoInfo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    
    if (!match) {
      throw new Error(`Could not parse owner/repo from remote URL: ${remoteUrl}`);
    }
    
    return { owner: match[1], repo: match[2] };
  } catch (error) {
    console.error('❌ Error getting git remote info:', error);
    process.exit(1);
  }
}

async function setBranchProtection(owner: string, repo: string, branch: string) {
  console.log(`\n--- Configuring Branch Protection for "${branch}" ---`);
  
  const requiredContexts = ['Run Tests'];

  try {
    await octokit.repos.updateBranchProtection({
      owner,
      repo,
      branch: branch,
      required_status_checks: {
        strict: true,
        contexts: requiredContexts,
      },
      enforce_admins: true,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 0, 
      },
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false,
    });
    
    console.log(`✅ Branch protection enabled for "${branch}".`);
  } catch (error) {
    // Explicitly cast error to unknown first, then check properties safely
    const err = error as { response?: { data?: { message?: string } }, message?: string };
    const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
    console.error(`❌ Error setting branch protection for ${branch}:`, errorMessage);
  }
}

async function main() {
  const { owner, repo } = await getRepoInfo();
  console.log(`🔧 Configuring repository: ${owner}/${repo}`);

  // 1. Create Staging Branch if needed
  try {
    console.log('\n--- Checking Staging Branch ---');
    try {
      await octokit.repos.getBranch({ owner, repo, branch: 'staging' });
      console.log('✅ Branch "staging" already exists.');
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err.status === 404) {
        console.log('✨ Branch "staging" not found. Creating it from "main"...');
        const mainRef = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
        await octokit.git.createRef({
          owner,
          repo,
          ref: 'refs/heads/staging',
          sha: mainRef.data.object.sha,
        });
        console.log('✅ Created branch "staging".');
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error('❌ Error managing staging branch:', error);
  }

  // 2. Set Default Branch to Staging
  try {
    console.log('\n--- Setting Default Branch ---');
    await octokit.repos.update({
      owner,
      repo,
      default_branch: 'staging'
    });
    console.log('✅ Default branch set to "staging".');
  } catch (error) {
     const err = error as { response?: { data?: { message?: string } }, message?: string };
     const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
     console.error('❌ Error setting default branch:', errorMessage);
  }

  // 3. Set Branch Protection
  await setBranchProtection(owner, repo, 'main');
  await setBranchProtection(owner, repo, 'staging');
}

main().catch(console.error);
