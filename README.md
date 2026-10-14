# Smart Campus Lost & Found — Angular + Node

A full-stack campus service for reporting and finding property. This is the Angular and native Node.js conversion of the React/Express project.

## Features
- Separate student sign-in and registration pages (`/login`, `/register`) with password hashing and signed HttpOnly sessions.
- Search and filter reports by text, category, department, and status.
- Authenticated report submission; reporters can edit or delete their own reports.
- Public cards show the reporter's name only. Student ID and contact details are not returned in report APIs.
- Private per-report chats restricted to the reporter and the student who opened that conversation.
- Ownership claim requests; administrators approve or reject, and approval marks an item as returned.
- Admin-only category management, status management, claim review and audit history.
- MySQL persistence with deployment SQL schema and migration.

## Run locally
1. Install Node.js 20.19+ (or 22.12+) and MySQL 8.
2. Copy `.env.example` to `.env` and set database settings, a session secret, and administrator credentials.
3. Install packages with `npm install`.
4. Create the database and tables using `npm run db:init` (database setup account must be allowed to create the database).
5. Start the API: `npm start` (default port 5000).
6. In a second terminal, run `npm run dev` and open the printed Angular development URL. Angular proxies `/api` requests to Node.

For production, run `npm run build`, then start the Node server with `NODE_ENV=production`. Node serves the built Angular application and API from one origin.

## Accounts
Public registration creates student accounts only. The administrator account is provisioned from `ADMIN_EMAIL` and `ADMIN_PASSWORD` on startup. Use a unique 16+ character admin password and a 32+ character `SESSION_SECRET`. Set secrets through the deployment host, not source control.

## Existing database
For a database installed from an older version, back it up and apply `database/migrate_accounts_and_chat.sql` once. Existing report rows are not linked automatically to accounts, so private chat is available for reports created after migration unless legacy ownership is assigned through a reviewed migration.

## Notes
Production requires a reachable MySQL database and a preinstalled schema. For campus deployment, connect account registration to the institution's identity provider or verify campus email before allowing student accounts to participate.
