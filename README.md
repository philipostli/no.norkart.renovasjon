# MinRenovasjon

A Homey app that provides an overview of when waste is collected at your address using the MinRenovasjon service.

## Features

- **Address Search**: Find your address using the Norwegian address registry (Geonorge)
- **Waste Calendar**: Shows pickup dates for different waste types
- **Multiple Waste Types**: Supports various waste fractions like general waste, paper, glass, plastic, etc.
- **Next Pickup**: Displays how many days until the next pickup and which waste type
- **Norwegian Localization**: Full support for Norwegian language and date formats

## Supported Waste Types

The app supports the following waste fractions:
- General waste (Restavfall)
- Paper, cardboard (Papp, papir, kartong)
- Glass and metal packaging (Glass- og metallemballasje)
- Special waste (Spesialavfall)
- Plastic (Plast)
- Textiles, clothes and shoes (Tekstiler, klær og sko)
- Electrical waste (Hvitevarer/EE-avfall)
- Garden waste (Hageavfall)
- Bio waste (Matavfall)

## Requirements

- Your municipality must use the MinRenovasjon system
- Valid API key for the MinRenovasjon service

## Development Setup

### Environment Variables

The app uses environment variables for configuration. For development, create an `env.json` file in the root directory:

```json
{
  "RENOVASJON_APP_KEY": "your-api-key-here",
  "API_BASE_URL": "minrenovasjon-api-url-here",
  "GEONORGE_URL": "https://ws.geonorge.no/adresser/v1/sok"
}
```

**Note**: The `env.json` file is already included in `.gitignore` to prevent sensitive data from being committed to version control.

### Required Environment Variables

- **`RENOVASJON_APP_KEY`**: API key for the MinRenovasjon service
- **`API_BASE_URL`**: Base URL for the MinRenovasjon API
- **`GEONORGE_URL`**: URL for the Norwegian address search service

### Development Commands

```bash
# Install dependencies
npm install

# Run the app in development mode (will automatically load env.json)
homey app run

# Validate the app
homey app validate

# Build the app
homey app build
```

## Production Deployment

For production deployment, set the environment variables in the Homey Developer Portal instead of using `env.json`:

1. Go to your app in the Homey Developer Portal
2. Navigate to the Environment Variables section
3. Set the required variables:
   - `RENOVASJON_APP_KEY`
   - `API_BASE_URL`
   - `GEONORGE_URL`

## Publishing the App

The app uses a two-step publishing process due to the need for local environment variables:

### Step 1: Update Version via GitHub Action

1. Go to the GitHub repository's Actions tab
2. Run the "Update Homey App Version" action
3. This will:
   - Increment the version number in `app.json`
   - Create a new commit and tag
   - Prepare the app for publishing

### Step 2: Local Publishing

Since the `env.json` file contains sensitive API keys and is not included in the repository, the final publishing step must be done locally:

```bash
# Ensure you have the latest changes
git pull origin main

# Make sure you have your env.json file with the required API keys
# (This file should already exist from your development setup)

# Publish the app to the Homey App Store
npm run publish
# or
homey app publish
```

**Important Notes:**
- The `env.json` file is required for publishing as it contains the API keys needed for validation
- Never commit `env.json` to the repository - it's already in `.gitignore`
- Make sure your local environment has the same API keys as configured in the Homey Developer Portal
- The GitHub Action handles version management, but local publishing is required for the final step

### Publishing Checklist

Before publishing, ensure:
- [ ] All tests pass locally
- [ ] The app works correctly with real API data (not test data)
- [ ] Version has been updated via GitHub Action
- [ ] `env.json` exists locally with correct API keys
- [ ] You have the necessary permissions in the Homey Developer Portal

## Architecture

The app consists of:

- **Driver** (`drivers/renovasjon/driver.js`): Handles device pairing and address validation
- **Device** (`drivers/renovasjon/device.js`): Manages waste calendar data and capabilities
- **API Helper** (`lib/api-helper.js`): Shared API functions for calendar and fractions data
- **Localization** (`locales/`): Norwegian and English translations

## API Integration

The app integrates with two main APIs:

1. **Geonorge API**: For address search and validation
2. **MinRenovasjon API**: For waste calendar and fractions data

All API calls are centralized in the `ApiHelper` class for better maintainability.

## License

See LICENSE file for details.