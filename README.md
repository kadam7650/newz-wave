# Newz Wave

A responsive news-site prototype with a GNews API proxy, category browsing, search, bookmarks, favourites, theme preference, browser notifications, reader profiles, and an admin publishing form.

## Run locally

1. Install Node.js 18 or later.
2. Run `npm install`.
3. In PowerShell, set a GNews API key with `$env:GNEWS_API_KEY="your-key"` (optional; without it the app uses built-in demo headlines).
4. Set `$env:ADMIN_API_KEY="your-admin-secret"` before starting the server; publishing stays disabled until configured.
5. Run `npm start` and open `http://localhost:3000`.
6. Optionally set `MONGO_URI` to persist admin-published stories in MongoDB. Without MongoDB, published stories are kept in server memory until it restarts.

News is fetched from GNews when a key is configured. The key stays on the server. Search, category filtering, and the latest-news feed otherwise use the included sample stories.

## Google Cloud Run

The project can be deployed from source with the Google Cloud Node.js buildpack; the `.gcloudignore` file excludes local dependencies and environment files. Install the Google Cloud CLI, sign in with `gcloud auth login`, select the exact lowercase Project ID with `gcloud config set project PROJECT_ID`, then deploy to `asia-south1`:

```powershell
gcloud run deploy newz-wave --source . --region asia-south1 --allow-unauthenticated
```

Cloud Run requires billing and may incur charges. Configure `GNEWS_API_KEY` and `ADMIN_API_KEY` in the Cloud Run service's Variables & Secrets settings, not in the source tree. Readers can access the site publicly; publishing stays disabled until `ADMIN_API_KEY` is configured, and the key is required in the Admin form.

## Prototype limitations

Registration and login are stored in this browser's local storage and are for a classroom/demo prototype only. Passwords are not hashed and accounts do not sync between devices. Before public deployment, replace these flows with server-side password hashing, sessions, and role-based authorization. Browser notifications require permission and a running server with live news configured to detect new headlines.
