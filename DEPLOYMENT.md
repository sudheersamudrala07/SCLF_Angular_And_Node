# Deployment
1. Create a MySQL database, then apply `database/schema.sql`; for an existing installation apply `database/migrate_accounts_and_chat.sql` once after taking a backup.
2. Configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` as deployment secrets.
3. Use a unique session secret of at least 32 characters and an administrator password of at least 16 characters.
4. Run `npm ci` and `npm run build`.
5. Set `NODE_ENV=production` and start with `npm start`. The Node server hosts API routes and the Angular static app on the same origin; deploy behind HTTPS.
6. Restrict the MySQL account to the application database. Install/migrate schema using a separate database administrator account.

The app refuses to start in production without the database and session secret. Public reports expose the reporter's name, but never student IDs or contact details. Private conversations are available to only the two participating accounts. Older unowned reports need an explicit ownership migration before chat can be enabled for them. For campus-wide access, connect student registration to campus identity verification.
