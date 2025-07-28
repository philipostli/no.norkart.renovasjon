# Publishing Guide for MinRenovasjon App

This document provides detailed instructions for publishing the MinRenovasjon Homey app.

## Overview

The app uses a hybrid publishing approach:
1. **Version management** via GitHub Actions (automated)
2. **Final publishing** done locally (due to sensitive environment variables)

## Prerequisites

Before you can publish the app, ensure you have:

- [ ] **Homey CLI installed** (`npm install -g homey`)
- [ ] **Local development environment** set up with `env.json`
- [ ] **Publishing permissions** in the Homey Developer Portal
- [ ] **Git access** to the repository with push permissions

## Step-by-Step Publishing Process

### 1. Prepare for Release

Before starting the publishing process:

```bash
# Ensure you're on the main branch
git checkout main
git pull origin main

# Run tests to ensure everything works
npm test

# Validate the app
npm run validate

# Test with real API data (disable test data in device.js)
# Make sure to re-enable API calls and disable test data
```

### 2. Update Version via GitHub Action

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Find the **"Update Homey App Version"** workflow
4. Click **"Run workflow"**
5. Select the version increment type:
   - `patch` for bug fixes (1.0.0 → 1.0.1)
   - `minor` for new features (1.0.0 → 1.1.0)
   - `major` for breaking changes (1.0.0 → 2.0.0)
6. Click **"Run workflow"**

The action will:
- Increment the version in `app.json`
- Create a git commit with the version change
- Create a git tag for the new version
- Push the changes to the repository

### 3. Sync Local Environment

After the GitHub Action completes:

```bash
# Pull the latest changes including the new version
git pull origin main

# Verify the version was updated
cat app.json | grep version

# Ensure your env.json file exists and has the correct API keys
cat env.json
```

Your `env.json` should contain:
```json
{
  "RENOVASJON_APP_KEY": "your-actual-api-key",
  "API_BASE_URL": "https://actual-api-url.com",
  "GEONORGE_URL": "https://ws.geonorge.no/adresser/v1/sok"
}
```

### 4. Final Validation

Before publishing, run a final validation:

```bash
# Validate the app with the new version
npm run validate

# If you have test data enabled, disable it now
# Edit drivers/renovasjon/device.js:
# - Comment out test data
# - Uncomment API call

# Test the app locally one more time
npm start
```

### 5. Publish to Homey App Store

```bash
# Publish the app
npm run publish

# Follow the prompts from the Homey CLI
# You may need to provide:
# - Changelog/release notes
# - Confirmation of the version
```

### 6. Post-Publishing

After successful publishing:

1. **Verify in App Store**: Check that the app appears correctly in the Homey App Store
2. **Test Installation**: Install the app on a test Homey to ensure it works
3. **Update Documentation**: If needed, update any user-facing documentation
4. **Announce Release**: Inform users about the new version if applicable

## Troubleshooting

### Common Issues

**"Environment variables not found"**
- Ensure `env.json` exists in your project root
- Verify all required variables are present and have valid values

**"Validation failed"**
- Run `npm run validate` to see specific validation errors
- Check that all required files are present and correctly formatted

**"Permission denied"**
- Ensure you have publishing permissions in the Homey Developer Portal
- Verify you're logged in with the correct account (`homey login`)

**"Version already exists"**
- The GitHub Action may have failed to increment the version
- Manually update the version in `app.json` and commit the change

### Recovery Steps

If publishing fails:

1. **Check the error message** for specific details
2. **Fix the issue** (usually validation or permission related)
3. **Don't increment version again** - just retry publishing
4. **If version needs to be changed**, update `app.json` manually

## Security Notes

- **Never commit `env.json`** to the repository
- **Keep API keys secure** and rotate them periodically
- **Use different API keys** for development and production if possible
- **Verify environment variables** in the Homey Developer Portal match your local setup

## Automation Considerations

While full automation would be ideal, the current setup requires local publishing due to:

- **Sensitive API keys** that cannot be stored in GitHub secrets
- **Homey CLI requirements** for the publishing process
- **Environment variable validation** during the publishing process

This hybrid approach provides a good balance between automation and security. 