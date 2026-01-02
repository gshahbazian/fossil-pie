# Fossil Pie

Fossil Pie is a web app that integrates with the Yahoo Fantasy Sports API. It authenticates users via Yahoo OAuth, handles the OAuth callback, and then fetches the user's fantasy teams along with the players on each team for display and future features.

## What It Does

- Starts a Yahoo OAuth flow to obtain an access token.
- Handles the OAuth callback and stores the credentials needed for API calls.
- Fetches the list of fantasy teams for the authenticated user.
- Fetches the list of players on each team.

## Local OAuth Setup

1. Copy `.env.example` to `.env` and fill in the Yahoo client ID and secret.
2. Run the frontend with `pnpm dev`.
3. Run the OAuth token exchange server with `pnpm dev:server`.
