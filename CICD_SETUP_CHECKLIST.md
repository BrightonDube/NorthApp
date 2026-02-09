# GitHub CI/CD Setup Checklist

Use this checklist to complete your CI/CD setup step by step.

## ✅ Prerequisites (Already Done)

- [x] GitHub repository exists
- [x] Expo account created
- [x] EAS CLI configured locally
- [x] GitHub Actions workflows created
- [x] App successfully builds locally

## 🔐 Step 1: Configure GitHub Secrets (5 minutes)

Go to: `https://github.com/[your-username]/[your-repo]/settings/secrets/actions`

### Required Secrets:

- [ ] **EXPO_TOKEN**
  - Get from: https://expo.dev/accounts/brightondubes-organization/settings/access-tokens
  - Click "Create Token" → Name it "GitHub Actions" → Copy token
  - Add to GitHub Secrets

- [ ] **EXPO_PUBLIC_SUPABASE_URL**
  - Value: `https://pigtshfobiwuwaionxpo.supabase.co`

- [ ] **EXPO_PUBLIC_SUPABASE_ANON_KEY**
  - Copy from your `.env` file (the long JWT token)

- [ ] **EXPO_PUBLIC_REVENUECAT_API_KEY**
  - Value: `goog_STdtGRkzcCyKlpqpLnsOEbokePb`

### Optional (for automatic store submission):

- [ ] **GOOGLE_SERVICE_ACCOUNT_KEY**
  - Get from: Google Play Console → Setup → API access
  - Create service account → Download JSON key
  - Copy entire JSON content and paste as secret

## 🚀 Step 2: Test the Setup (10 minutes)

### 2.1 Push Code to GitHub

```bash
cd north-mobile
git add .
git commit -m "Setup CI/CD workflows"
git push origin main
```

**Expected result:**
- ✅ Test workflow runs automatically
- ✅ EAS Update workflow runs automatically

### 2.2 Trigger Manual Build

1. Go to: `https://github.com/[your-username]/[your-repo]/actions`
2. Click "EAS Build" workflow
3. Click "Run workflow" button
4. Select:
   - Platform: `android`
   - Profile: `production`
5. Click "Run workflow"

**Expected result:**
- ✅ Build starts in GitHub Actions
- ✅ Build appears in Expo dashboard
- ✅ Build completes successfully

### 2.3 Test Auto-Submit (Optional)

1. Go to Actions → "EAS Submit" workflow
2. Click "Run workflow"
3. Select platform: `android`
4. Click "Run workflow"

**Expected result:**
- ✅ Submission starts
- ✅ App submitted to Play Store internal track

## 🛡️ Step 3: Set Up Branch Protection (5 minutes)

Go to: `https://github.com/[your-username]/[your-repo]/settings/branches`

- [ ] Click "Add rule"
- [ ] Branch name pattern: `main`
- [ ] Check: "Require a pull request before merging"
- [ ] Check: "Require status checks to pass before merging"
- [ ] Select status check: "Run Tests"
- [ ] Click "Create"

## 📊 Step 4: Optional Enhancements

### 4.1 Codecov Integration (Optional)

- [ ] Sign up at https://codecov.io with GitHub
- [ ] Add repository
- [ ] Copy Codecov token
- [ ] Add `CODECOV_TOKEN` to GitHub Secrets

### 4.2 Slack Notifications (Optional)

Add to workflow files:

```yaml
- name: 📢 Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

- [ ] Create Slack webhook
- [ ] Add `SLACK_WEBHOOK` to GitHub Secrets

### 4.3 Discord Notifications (Optional)

- [ ] Create Discord webhook
- [ ] Add `DISCORD_WEBHOOK` to GitHub Secrets

## 🎯 Step 5: Verify Everything Works

### Test the Complete Flow:

1. **Create a feature branch**
   ```bash
   git checkout -b test/ci-cd-verification
   ```

2. **Make a small change**
   ```bash
   echo "# CI/CD Test" >> README.md
   git add README.md
   git commit -m "Test CI/CD pipeline"
   git push origin test/ci-cd-verification
   ```

3. **Create Pull Request**
   - [ ] Go to GitHub and create PR
   - [ ] Verify tests run automatically
   - [ ] Check test results

4. **Merge PR**
   - [ ] Merge the PR
   - [ ] Verify tests run on main
   - [ ] Verify EAS Update publishes

5. **Trigger Production Build**
   - [ ] Go to Actions → EAS Build
   - [ ] Run workflow for production
   - [ ] Verify build completes

6. **Submit to Store (Optional)**
   - [ ] Go to Actions → EAS Submit
   - [ ] Run workflow
   - [ ] Verify submission succeeds

## ✅ Success Criteria

Your CI/CD is fully set up when:

- [x] All GitHub secrets are configured
- [ ] Tests run automatically on PRs
- [ ] Tests run automatically on main branch pushes
- [ ] OTA updates publish automatically on main branch pushes
- [ ] Manual builds can be triggered from GitHub Actions
- [ ] Builds complete successfully
- [ ] (Optional) Store submissions work automatically

## 📝 Next Steps After Setup

1. **Document your workflow** in team wiki/docs
2. **Train team members** on how to use CI/CD
3. **Set up monitoring** for build failures
4. **Create release process** documentation
5. **Schedule regular builds** (if needed)

## 🆘 Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Verify all secrets are set correctly
- Check Expo dashboard for detailed errors

### Tests Fail
- Run tests locally first: `npm test`
- Check for environment-specific issues
- Review test logs in GitHub Actions

### Submission Fails
- Verify service account key is correct
- Check Play Console API access is enabled
- Ensure app is properly configured in Play Console

## 📚 Resources

- Full guide: `GITHUB_CICD_SETUP_GUIDE.md`
- Expo docs: https://docs.expo.dev/build/introduction/
- GitHub Actions: https://docs.github.com/en/actions

---

**Estimated total setup time: 20-30 minutes**

Once complete, your CI/CD pipeline will:
- ✅ Run tests automatically
- ✅ Build apps on demand
- ✅ Publish OTA updates automatically
- ✅ Submit to stores (optional)
