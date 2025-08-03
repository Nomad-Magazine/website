# Preview Deployments

This document explains how our automated preview deployment system works for pull requests using Cloudflare Workers and Preview URLs.

## Overview

Every pull request automatically gets its own preview deployment with a unique, persistent URL that stays active throughout the PR lifecycle. This allows for easy testing and review of changes before they reach production.

## How It Works

### Automatic Preview Creation

1. **PR Created**: When you create a pull request, GitHub Actions automatically builds and deploys your changes to a preview environment
2. **Unique Alias**: Each preview gets a human-readable alias based on the PR number and branch name (e.g., `pr-123-feature-auth`)
3. **Persistent URL**: The preview URL remains the same throughout the PR lifecycle, even when you push new commits
4. **Automatic Updates**: New commits to the PR automatically update the preview deployment

### Preview URL Format

Preview URLs follow this pattern:
```
https://{alias}-{worker-name}.{subdomain}.workers.dev
```

Example:
```
https://pr-123-feature-auth-nomad-magazine.your-subdomain.workers.dev
```

### Alias Naming Convention

The alias is generated using this format:
- `pr-{PR_NUMBER}-{CLEAN_BRANCH_NAME}`
- Branch names are sanitized to only include lowercase letters, numbers, and dashes
- Length is limited to comply with DNS restrictions (63 characters total)
- Examples:
  - PR #123 from branch `feature/auth` → `pr-123-feature-auth`
  - PR #456 from branch `fix/user-login` → `pr-456-fix-user-login`
  - PR #789 from branch `feat/very-long-branch-name-that-exceeds-limits` → `pr-789-feat-very-long-branch`

## Features

### 🚀 Automatic Deployment
- Every PR gets deployed automatically
- No manual intervention required
- Deploys happen on every push to the PR branch

### 📝 Rich PR Comments
Each PR gets a detailed comment with:
- Direct link to the preview URL
- Alias information
- Branch and commit details
- Deployment status

### 🔄 Auto-Updates
- Comments are updated (not duplicated) when new deployments occur
- Preview URL stays the same, content gets updated

### 🧹 Automatic Cleanup
- Preview deployments are automatically marked for cleanup when PRs are closed
- Cloudflare manages the lifecycle of preview URLs (1000 most recent are retained)
- Daily cleanup job runs to maintain system hygiene

## Configuration

### Wrangler Configuration

The `wrangler.toml` includes preview-specific settings:

```toml
# Enable preview URLs for PR deployments
preview_urls = true

# Environment-specific configurations
[env.preview]
workers_dev = true
# Uses workers.dev subdomain for previews

[env.production]
workers_dev = false
routes = [
  { pattern = "nomad-magazine.com/*", zone_name = "nomad-magazine.com" },
  { pattern = "www.nomad-magazine.com/*", zone_name = "nomad-magazine.com" }
]
```

### GitHub Actions Workflows

1. **Deploy Workflow** (`.github/workflows/deploy.yml`):
   - Handles both production and preview deployments
   - Uses `wrangler versions upload --preview-alias` for PR deployments
   - Falls back to regular deploy if preview creation fails

2. **Cleanup Workflow** (`.github/workflows/cleanup-previews.yml`):
   - Runs when PRs are closed
   - Scheduled daily cleanup
   - Updates PR comments to indicate cleanup status

## Limitations

### Current Limitations
- Preview URLs are only generated for Workers uploaded after 2024-09-25
- Cannot configure Preview URLs to run on custom domains (workers.dev only)
- No logs available for Preview URLs currently
- Manual deletion of preview URLs is not currently supported via CLI

### Cloudflare Limits
- Only the 1000 most recently deployed aliases are retained
- When a new alias is created beyond this limit, the least recently deployed alias is deleted automatically

## Troubleshooting

### Preview Not Created
If a preview deployment fails:
1. Check the GitHub Actions logs for error messages
2. Ensure all required secrets are configured in the repository
3. Verify the branch name doesn't contain unsupported characters
4. Check if Wrangler version supports preview aliases (requires 4.21.0+)

### Preview URL Not Working
1. Wait a few minutes for DNS propagation
2. Check if the preview was successfully created in the Actions logs
3. Verify the URL format matches the expected pattern
4. Try accessing the fallback workers.dev URL

### Missing PR Comments
1. Ensure the `GITHUB_TOKEN` has appropriate permissions
2. Check if the GitHub Actions workflow completed successfully
3. Verify the comment update logic in the workflow logs

## Manual Operations

### Manual Cleanup
You can manually trigger cleanup for a specific PR:

```bash
# Go to Actions tab in GitHub
# Run "Cleanup Preview Deployments" workflow
# Enter the PR number when prompted
```

### Force Redeploy
To force a new preview deployment:

```bash
# Push a new commit to the PR branch, or
# Close and reopen the PR, or
# Manually run the Deploy workflow from Actions tab
```

## Security Considerations

- Preview URLs are publicly accessible
- Use same environment variables as production (but isolated environment)
- No sensitive data should be hardcoded in the codebase
- Preview deployments use the same Cloudflare account as production

## Benefits

1. **Easy Review**: Reviewers can test changes in a live environment
2. **CI/CD Integration**: Automated testing can run against preview URLs
3. **Stakeholder Access**: Non-technical stakeholders can preview changes
4. **Debugging**: Easier to debug issues in an isolated environment
5. **Performance Testing**: Test performance impact of changes
6. **Mobile Testing**: Easy access for mobile device testing

## Future Enhancements

Potential improvements as Cloudflare adds more features:
- Custom domain support for previews
- Log access for preview deployments
- Manual deletion of preview URLs
- Preview URL analytics
- Environment-specific configurations for previews