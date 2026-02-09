# Automatic Release to Store Guide

## Overview

Your app is now configured to **automatically build and submit to the Google Play Store** whenever you push to the `main` branch!

## How It Works

### Workflow Sequence

When you push to `main`, the following happens automatically:

```
Push to main
    ↓
1. Run Tests (5-10 min)
    ↓
2. Build Android App (10-15 min)
    ↓
3. Submit to Play Store (2-5 min)
    ↓
4. Publish OTA Update (2-3 min)
```

**Total time: ~20-30 minutes from push to store submission**

### What Triggers the Release

The release workflow triggers on push to `main` when:

✅ Any code in `north-mobile/` changes
✅ Excludes: markdown files, test files, coverage reports, GitHub workflows

### What Happens

1. **Tests Run First**
   - All unit tests execute
   - If tests fail, the build is cancelled
   - No broken code reaches the store

2. **Build Starts**
   - EAS builds Android production app bundle
   - Uses `--wait` flag to wait for build completion
   - Build takes ~10-15 minutes

3. **Automatic Submission**
   - Submits the latest build to Play Store
   - Goes to "internal" track by default
   - Uses service account key for authentication

4. **OTA Update Published**
   - Publishes over-the-air update in parallel
   - Existing users get updates immediately
   - No store review needed for OTA updates

## Configuration Files

### 1. Release Workflow (`.github/workflows/release.yml`)

This is the main automatic release workflow with 3 jobs:
- `test`: Runs tests first
- `build`: Builds the Android app (waits for completion)
- `submit`: Submits to Play Store

### 2. OTA Update Workflow (`.github/workflows/eas-update.yml`)

Publishes over-the-air updates for JavaScript changes:
- Runs in parallel with release workflow
- Updates existing app installations
- No store review needed

### 3. Manual Workflows (Still Available)

- `eas-build.yml`: Manual builds when needed
- `eas-submit.yml`: Manual submissions when needed
- `test.yml`: Runs on PRs

## Required Secrets

Make sure these are set in GitHub → Settings → Secrets:

✅ **EXPO_TOKEN** - Expo access token
✅ **EXPO_PUBLIC_SUPABASE_URL** - Supabase URL
✅ **EXPO_PUBLIC_SUPABASE_ANON_KEY** - Supabase anon key
✅ **EXPO_PUBLIC_REVENUECAT_API_KEY** - RevenueCat API key
✅ **GOOGLE_SERVICE_ACCOUNT_KEY** - Google Play service account JSON

## Usage

### Normal Development Flow

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and test locally**
   ```bash
   npm test
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```
   - Tests run automatically on PR
   - Review and get approval

4. **Merge to main**
   ```bash
   # Via GitHub UI or:
   git checkout main
   git merge feature/my-feature
   git push origin main
   ```

5. **Automatic release starts!**
   - Watch progress in GitHub Actions
   - Build completes in ~20-30 minutes
   - App submitted to Play Store automatically

### Monitoring the Release

1. **GitHub Actions**
   - Go to: `https://github.com/[your-repo]/actions`
   - Click on the running "Release to Store" workflow
   - Monitor each job: Test → Build → Submit

2. **Expo Dashboard**
   - Go to: https://expo.dev/accounts/brightondubes-organization/projects/north/builds
   - See build progress and logs

3. **Google Play Console**
   - Go to: https://play.google.com/console
   - Check "Internal testing" track
   - See submitted build

## Release Tracks

The app submits to the **internal track** by default. You can change this in `eas.json`:

```json
{
  "submit": {
    "production": {
      "android": {
        "track": "internal"  // Options: internal, alpha, beta, production
      }
    }
  }
}
```

### Track Options:

- **internal**: For internal testing (current setting)
- **alpha**: For alpha testers
- **beta**: For beta testers  
- **production**: For all users (requires manual promotion in Play Console)

## Version Management

### Automatic Version Bumping (Recommended)

Update version in `app.json` before merging to main:

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

**Important:** 
- `version`: User-facing version (1.0.0, 1.0.1, etc.)
- `versionCode`: Must increment for each Play Store submission
- Play Store rejects submissions with duplicate versionCode

### Version Bump Script (Optional)

Create `scripts/bump-version.sh`:

```bash
#!/bin/bash
# Bump Android versionCode automatically

CURRENT=$(grep -o '"versionCode": [0-9]*' north-mobile/app.json | grep -o '[0-9]*')
NEW=$((CURRENT + 1))

sed -i "s/\"versionCode\": $CURRENT/\"versionCode\": $NEW/" north-mobile/app.json

echo "Bumped versionCode from $CURRENT to $NEW"
```

## Controlling Releases

### Option 1: Use Release Branches

Instead of pushing directly to main, use release branches:

```bash
# Create release branch
git checkout -b release/v1.0.1

# Make final changes
# Update version in app.json

# Push and create PR
git push origin release/v1.0.1

# Merge to main when ready to release
```

### Option 2: Use Git Tags

Tag releases for better tracking:

```bash
# After merging to main
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin v1.0.1
```

### Option 3: Manual Approval (Advanced)

Modify `.github/workflows/release.yml` to require manual approval:

```yaml
submit:
  name: Submit to Play Store
  needs: build
  environment: production  # Add this line
  runs-on: ubuntu-latest
  # ... rest of config
```

Then create a "production" environment in GitHub with required reviewers.

## Troubleshooting

### Build Fails

**Check:**
- GitHub Actions logs for error details
- Expo dashboard for build logs
- All secrets are configured correctly

**Common issues:**
- Missing dependencies
- TypeScript errors
- Native module issues

### Submission Fails

**Check:**
- Service account key is valid
- Play Console API access is enabled
- Version code is incremented
- App is properly configured in Play Console

**Common issues:**
- Duplicate versionCode
- Invalid service account permissions
- App not created in Play Console yet

### Tests Fail

**Check:**
- Tests pass locally: `npm test`
- No environment-specific issues
- All required environment variables set

**Fix:**
- Fix failing tests before merging
- Or temporarily skip tests (not recommended)

## Best Practices

### 1. Always Test Locally First

```bash
npm test
npm run test:coverage
```

### 2. Use Pull Requests

- Never push directly to main
- Always create PR and get review
- Tests run automatically on PR

### 3. Increment Version Numbers

- Update `version` and `versionCode` before release
- Follow semantic versioning (1.0.0 → 1.0.1 → 1.1.0)

### 4. Monitor Releases

- Watch GitHub Actions for failures
- Check Play Console for submission status
- Test the submitted build before promoting

### 5. Use Internal Track First

- Submit to internal track first
- Test thoroughly
- Promote to production manually in Play Console

### 6. Keep Changelog

Create `CHANGELOG.md` to track changes:

```markdown
# Changelog

## [1.0.1] - 2026-02-09
### Added
- New calm design system
- Improved animations

### Fixed
- Build configuration issues
```

## Emergency Procedures

### Stop a Release

If you need to stop a release in progress:

1. Go to GitHub Actions
2. Click on running workflow
3. Click "Cancel workflow"

### Rollback a Release

If a bad release goes out:

1. **For OTA updates:**
   ```bash
   eas update --branch production --message "Rollback to previous version"
   ```

2. **For store releases:**
   - Cannot rollback automatically
   - Submit a new fixed version
   - Or deactivate the release in Play Console

### Hotfix Process

For urgent fixes:

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-fix

# Make fix
# Update version (e.g., 1.0.1 → 1.0.2)

# Push and merge immediately
git push origin hotfix/critical-fix
# Merge to main via fast-track PR

# Release happens automatically
```

## Notifications (Optional)

### Add Slack Notifications

Add to `.github/workflows/release.yml`:

```yaml
- name: 📢 Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Release ${{ github.ref }} - ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Add Discord Notifications

```yaml
- name: 📢 Notify Discord
  if: always()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
    title: "Release to Play Store"
```

## Metrics to Track

Monitor these metrics for your release pipeline:

- **Build success rate**: Should be >95%
- **Build duration**: Should be <20 minutes
- **Test pass rate**: Should be 100%
- **Time to production**: From merge to store submission
- **Rollback frequency**: Should be minimal

## Summary

✅ **Automatic releases are now enabled!**

Every push to `main` will:
1. Run tests
2. Build the app
3. Submit to Play Store internal track
4. Publish OTA update

**Next steps:**
1. Test the workflow by pushing a small change
2. Monitor the release in GitHub Actions
3. Check Play Console for the submission
4. Set up notifications (optional)
5. Document your release process for the team

---

**Your app will now automatically release to the Play Store on every main branch push! 🚀**
