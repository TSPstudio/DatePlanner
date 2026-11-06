# Our Date Planner

A private, romantic date planner designed for two people. Includes a static single-page frontend hosted on GitHub Pages and a serverless backend powered by Cloudflare Workers and Cloudflare D1.

## Features

- **Cozy Dark Mode**: Palette, typography, and floating dynamic background inspired by `vane-pomodoro`.
- **Two-Person Collaboration**: Both users can submit date ideas and view the shared list.
- **Random Roll with 2-Week Cooldown**: Rolling a date marks it as cooling down for 14 days, preventing duplicate picks.
- **Waitlist Control**: Either person can release a date from cooldown at any time.
- **Private & Secure**: Only the two designated users can access the database via token-based login. All sensitive keys and credentials remain out of source control.

## Project Structure

```text
DatePlanner/
├── .gitignore
├── index.html
├── styles.css
├── app.js
├── worker/
│   ├── package.json
│   ├── tsconfig.json
│   ├── wrangler.json
│   ├── schema.sql
│   └── src/
│       └── index.ts
└── README.md
```

## Cloudflare Worker Setup

### 1. Install Dependencies

Open a terminal in the `worker` directory:

```bash
cd worker
npm install
```

### 2. Create Cloudflare D1 Database

Run the following command to create your remote D1 database:

```bash
npx wrangler d1 create date-planner-db
```

Copy the generated `database_id` into `worker/wrangler.json` under `d1_databases[0].database_id`.

### 3. Initialize the Database Schema

Run the schema migration locally and remotely:

```bash
npx wrangler d1 execute date-planner-db --local --file=schema.sql
npx wrangler d1 execute date-planner-db --remote --file=schema.sql
```

### 4. Configure Secrets for the Two Users

Store the private login credentials safely in Cloudflare Workers secrets (never committed to Git):

```bash
npx wrangler secret put USER1_NAME
npx wrangler secret put USER1_PASSWORD
npx wrangler secret put USER2_NAME
npx wrangler secret put USER2_PASSWORD
npx wrangler secret put AUTH_SECRET
```

### 5. Deploy the Worker

Deploy the API to Cloudflare Workers:

```bash
npx wrangler deploy
```

Save the deployment URL (for example: `https://date-planner-api.<your-subdomain>.workers.dev`).

## GitHub Pages Deployment

1. Commit the local repository and push to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Date Planner"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. In your repository on GitHub, go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **Deploy from a branch**.
4. Set branch to `main` and folder to `/ (root)`. Click **Save**.
5. Once deployed, open your GitHub Pages site.
6. Click the ⚙️ icon in the top right, enter your deployed Cloudflare Worker URL, and click **Save Settings**.
7. Log in with the credentials set in your Cloudflare secrets.
