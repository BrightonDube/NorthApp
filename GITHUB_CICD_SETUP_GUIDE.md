# GitHub CI/CD Setup Guide for North Mobile App

## Overview

Your GitHub Actions workflows are already configured! This guide will help you complete the setup and understand how to use them.

## Current Workflows

You have 3 workflows already set up:

1. **EAS Build** (`.github/workflows/eas-build.yml`) - Manual builds
2. **EAS Update** (`.github/workflows/eas-update.yml`) - Automatic OTA updates on push to main
3. **Test** (`.github/workflows/test.yml`) - Automatic tests on PRs and pushes

## Setup Steps

### Step 1: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

#### Required Secrets:

1. **EXPO_TOKEN**
   - Get it from: https://expo.dev/accounts/[your-account]/settings/access-tokens
   - Click "Create Token"
   - Give it a name like "GitHub Actions"
   - Copy the token and add it to GitHub secrets

2. **EXPO_PUBLIC_SUPABASE_URL**
   - Value: `https://pigtshfobiwuwaionxpo.supabase.co`
   - (Already in your .env file)

3. **EXPO_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon key from .env file
   - (Already in your .env file)

4. **EXPO_PUBLIC_REVENUECAT_API_KEY**
   - Value: `goog_STdtGRkzcCyKlpqpLnsOEbokePb`
   - (Already in your .env file)

#### Optional Secrets (for automatic Play Store submission):

5. **GOOGLE_SERVICE_ACCOUNT_KEY**
   - This is the JSON key file content for Google Play Store submission
   - Get it from: Google Play Console → Setup → API access
   - Copy the entire JSON content and paste as secret

6. **APPLE_ID** (for iOS submission)
   - Your Apple ID email

7. **ASC_APP_ID** (for iOS submission)
   - Your App Store Connect app ID

8. **APPLE_TEAM_ID** (for iOS submission)
   - Your Apple Developer Team ID

### Step 2: Push Your Code to GitHub

```bash
cd north-mobile
git push origin main
```

This will trigger:
- ✅ Test workflow (runs tests)
- ✅ EAS Update workflow (publishes OTA update)

### Step 3: Trigger a Build Manually

1. Go to GitHub → Actions tab
2. Click "EAS Build" workflow
3. Click "Run workflow"
4. Select:
   - Platform: `android` (or `all` for both)
   - Profile: `production`
5. Click "Run workflow"

The build will start and you'll see progress in the Actions tab.

### Step 4: Monitor Build Progress

- Click on the running workflow to see logs
- Build will appear in your Expo dashboard: https://expo.dev/accounts/brightondubes-organization/projects/north/builds
- You'll get the build artifact URL when complete

## Workflow Details

### 1. EAS Build Workflow (Manual)

**Trigger:** Manual via GitHub Actions UI

**What it does:**
- Checks out code
- Sets up Node.js and EAS CLI
- Installs dependencies
- Builds the app for selected platform and profile
- Uses `--no-wait` so it doesn't block the workflow

**When to use:**
- When you want to create a new production build
- When testing build configurations
- Before submitting to app stores

### 2. EAS Update Workflow (Automatic)

**Trigger:** Push to `main` branch (only when north-mobile files change)

**What it does:**
- Publishes an Over-The-Air (OTA) update
- Users with the app installed get the update automatically
- No need to rebuild or resubmit to stores

**When it runs:**
- Every push to main that changes north-mobile code
- Skips if only markdown or GitHub files changed

**Note:** OTA updates only work for JavaScript/React changes, not native code changes.

### 3. Test Workflow (Automatic)

**Trigger:** 
- Pull requests to `main`
- Pushes to `main`

**What it does:**
- Runs unit tests (excludes property and integration tests)
- Generates coverage report
- Uploads coverage to Codecov (optional)

**When it runs:**
- On every PR to catch issues early
- On every push to main to ensure quality

## Advanced: Add Automatic Store Submission

If you want to automatically submit builds to stores, create a new workflow:


### Optional: Create Auto-Submit Workflow

Create `.github/workflows/eas-submit.yml`:

```yaml
name: EAS Submit

on:
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to submit'
        required: true
        type: choice
        options:
          - android
          - ios
          - all

jobs:
  submit:
    name: Submit to ${{ github.event.inputs.platform }} store
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./north-mobile
    
    steps:
      - name: 🏗 Checkout repository
        uses: actions/checkout@v4

      - name: 🏗 Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: npm
          cache-dependency-path: north-mobile/package-lock.json

      - name: 🏗 Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: npm ci

      - name: 📝 Create service account key file (Android)
        if: github.event.inputs.platform == 'android' || github.event.inputs.platform == 'all'
        run: echo '${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}' > play-store-key.json

      - name: 🚀 Submit to stores
        run: eas submit --platform ${{ github.event.inputs.platform }} --latest --non-interactive
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}
          EXPO_PUBLIC_REVENUECAT_API_KEY: ${{ secrets.EXPO_PUBLIC_REVENUECAT_API_KEY }}

      - name: 🧹 Cleanup
        if: always()
        run: rm -f play-store-key.json
```

Then update `eas.json` to use the new key file:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./play-store-key.json",
      "track": "internal"
    }
  }
}
```

## Complete CI/CD Flow

### For Feature Development:

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature/my-feature
   ```

3. **Create Pull Request**
   - GitHub Actions runs tests automatically
   - Review test results before merging

4. **Merge to main**
   - Tests run again
   - EAS Update publishes OTA update automatically
   - Users get the update within minutes

### For Production Releases:

1. **Trigger build manually**
   - Go to Actions → EAS Build → Run workflow
   - Select platform and production profile

2. **Wait for build to complete**
   - Monitor in GitHub Actions
   - Check Expo dashboard for build status

3. **Submit to stores**
   - Option A: Manual submission via `eas submit`
   - Option B: Use the auto-submit workflow (if configured)

4. **Monitor store review**
   - Google Play: Usually 1-3 days
   - App Store: Usually 1-2 days

## Troubleshooting

### Build Fails

**Check:**
- All secrets are configured correctly
- No syntax errors in workflow files
- Dependencies are up to date
- EAS configuration is valid

**View logs:**
- GitHub Actions tab → Click on failed workflow → View logs

### Tests Fail

**Check:**
- Tests pass locally: `npm test`
- All environment variables are set
- No breaking changes in dependencies

### OTA Update Not Working

**Check:**
- App is using the same runtime version
- Update is published: Check Expo dashboard
- App has internet connection
- Update channel matches

## Best Practices

### 1. Branch Protection

Set up branch protection for `main`:
- Require pull request reviews
- Require status checks to pass (tests)
- Require branches to be up to date

### 2. Semantic Versioning

Update version in `app.json` for each release:
```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    },
    "ios": {
      "buildNumber": "2"
    }
  }
}
```

### 3. Release Notes

Create GitHub releases with changelogs:
- Tag format: `v1.0.1`
- Include what's new, bug fixes, improvements

### 4. Environment-Specific Builds

Use different profiles for different environments:
- `development`: For local testing
- `preview`: For internal testing
- `production`: For store releases

### 5. Monitoring

Set up monitoring for:
- Build success/failure notifications
- Test coverage trends
- Deployment frequency

## Quick Reference Commands

### Local Development
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build locally (preview)
eas build --platform android --profile preview --local

# Publish OTA update
eas update --auto
```

### GitHub Actions
```bash
# Trigger build
# Go to Actions → EAS Build → Run workflow

# View workflow runs
# Go to Actions tab

# Cancel workflow
# Click on running workflow → Cancel workflow
```

## Next Steps

1. ✅ Add all required secrets to GitHub
2. ✅ Push code to trigger workflows
3. ✅ Test the build workflow manually
4. ✅ Set up branch protection rules
5. ✅ Configure Codecov (optional)
6. ✅ Set up Slack/Discord notifications (optional)
7. ✅ Create the auto-submit workflow (optional)

## Resources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Expo EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [EAS GitHub Action](https://github.com/expo/expo-github-action)

---

**Your CI/CD is ready to use!** Just add the secrets and you're good to go. 🚀
