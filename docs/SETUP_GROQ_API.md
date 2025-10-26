# Setup Guide: Groq API for GitHub Actions

This guide explains how to set up the Groq API key for the automated issue-to-PR workflow.

## What is Groq?

Groq provides free access to powerful LLM models like Llama 3.1 70B through their API. This makes it an excellent choice for GitHub Actions automation without incurring costs.

## Step 1: Get a Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the API key (it starts with `gsk_...`)

## Step 2: Add API Key to GitHub Repository

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `GROQ_API_KEY`
6. Value: Paste your Groq API key
7. Click **Add secret**

## Step 3: Test the Workflow

1. Create a new issue in your repository, or edit an existing one
2. The workflow should automatically trigger
3. Check the **Actions** tab to see the workflow progress
4. A draft pull request should be created with the AI-generated solution

**Note**: The workflow triggers on both issue creation (`opened`) and issue updates (`edited`).

## Groq Free Tier Limits

- **Rate Limits**: 30 requests per minute
- **Daily Limits**: Generous free tier (check current limits on Groq's website)
- **Models Available**: Llama 3.3 70B, Llama 3.1 8B, OpenAI GPT-OSS models, and others (2025)

## Troubleshooting

### Workflow fails with authentication error
- Verify the `GROQ_API_KEY` secret is correctly set
- Ensure the API key is valid and not expired

### No pull request created
- Check the Actions logs for errors
- Verify the workflow has proper permissions (contents: write, pull-requests: write)

### Rate limit exceeded
- The workflow includes error handling for rate limits
- Consider adding delays between requests if you have many issues

## Security Notes

- Never commit API keys to your repository
- Use GitHub Secrets to store sensitive information
- The workflow runs in a secure environment and doesn't expose your API key

## Customization

You can modify the workflow to:
- Use different Groq models (change the `model` parameter - see available models: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `openai/gpt-oss-120b`, etc.)
- Adjust the solution length (`max_tokens`)
- Modify the prompt for different types of responses
- Add additional context about your project
- The workflow automatically uses Context7 for up-to-date documentation and 2025 best practices

## Support

- [Groq Documentation](https://console.groq.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
