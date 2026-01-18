# Individual Project Repo Templates

These templates help you connect your project repository to the central Gene-Brain tracking hub.

## Quick Start

### 1. Automatic Commit Sync (Required)

Copy `sync_commits_to_central.yml` to your repo's `.github/workflows/` directory:

```bash
mkdir -p .github/workflows
cp sync_commits_to_central.yml .github/workflows/
```

Then create a secret in your repo:
- Name: `BIG_REPO_TOKEN`
- Value: A Personal Access Token (PAT) with `repo` scope that can write to `allison-eunse/gene-brain`

### 2. Daily Log Publishing (Optional)

Copy `publish_today.sh` to your repo root and make it executable:

```bash
cp publish_today.sh ./
chmod +x publish_today.sh
```

#### Usage

1. Create a `TODAY.md` file in your repo root with your daily summary
2. Review the content (you can use AI to help generate it)
3. Run `./publish_today.sh`

The script will:
- Auto-detect your GitHub username and repo name
- Copy `TODAY.md` to the central hub as `team-tracking/<owner>/<repo>/daily/YYYY-MM-DD.md`
- Commit and push to the central repo

#### Suggested TODAY.md Template

```markdown
# Daily Log - YYYY-MM-DD

## What I did
- 

## Blockers
- 

## Next steps
- 

## Notes
- 
```

## Configuration

### sync_commits_to_central.yml

| Variable | Default | Description |
|----------|---------|-------------|
| `BIG_REPO` | `allison-eunse/gene-brain` | Central hub repository |
| `ROLLING_WINDOW` | `50` | Number of recent commits to sync |

### publish_today.sh

| Variable | Default | Description |
|----------|---------|-------------|
| `BIG_REPO` | `allison-eunse/gene-brain` | Central hub repository |
| `TODAY_FILE` | `TODAY.md` | Source file for daily log |
| `OWNER` | (auto-detected) | Your GitHub username |
| `REPO` | (auto-detected) | This repository name |

## Security Notes

- **Commits**: Only metadata is synced (SHA, message, timestamp). No code or diffs.
- **Commit messages**: Truncated to 120 characters.
- **Daily logs**: You control the content—review before publishing.
- **Tokens**: The PAT only needs write access to the central repo, not your private repos.

## Troubleshooting

### "Push failed" in workflow

This can happen if multiple repos push simultaneously. The workflow includes retry logic, but if it persists:
1. Wait a few minutes and re-run the workflow
2. Or manually trigger the workflow from the Actions tab

### "Permission denied" in publish_today.sh

Ensure you have push access to the central repo:
- Via HTTPS: Set up a credential helper or use `GH_TOKEN`
- Via SSH: Ensure your SSH key is added to GitHub and has access
