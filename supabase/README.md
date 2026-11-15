# Supabase account setup

The app uses Supabase Auth for Google sign-in, `profiles` for player discovery,
`friend_requests` for friend requests, and `player_saves` for cloud saves.

1. In Supabase, open **SQL Editor**, paste and run
   `migrations/20261115000000_player_accounts_and_friends.sql`.
2. In **Authentication → Providers**, enable Google and add the Google OAuth
   client ID and secret. In the Google Cloud OAuth configuration, add the
   Supabase callback URL shown by the provider settings.
3. In **Authentication → URL Configuration**, add the deployed site URL and
   local development URL to the allowed redirect URLs.
4. Copy `.env.example` to `.env.local`, then fill in the project's URL and
   publishable/anon key from **Project Settings → API**. Never put a
   `service_role` key in a browser app.
5. Restart the Vite dev server after changing environment variables.

## Profile CSV

`profiles_import_template.csv` is the header template for the `profiles` table.
Do not use it to create player accounts: Google sign-in creates each Supabase
Auth user and the SQL trigger creates that user's profile automatically. The
`user_id` must match an existing `auth.users.id`; never invent IDs or import
friend relationships manually. New players can find one another by the unique
username shown in their account settings.

The current game client still simulates matches locally. Google accounts,
friend requests, and cloud saves are backed by Supabase, but joining a friend's
live game requires a separate multiplayer game server and is not provided by
these tables.
