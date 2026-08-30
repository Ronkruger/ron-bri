# RonBri private deployment

This repository deploys as one Render Docker web service. The Express server serves
the production web build, API, and Socket.IO from one HTTPS origin.

## 1. Create the database

1. Create one **Aiven for MySQL Free** service.
2. Copy its TLS-enabled MySQL connection URI into Render as `DATABASE_URL`.
3. Migrate data before changing the live app: export the current MySQL database,
   import it into Aiven, then run `npm run db:push --workspace=server` and
   `npm run db:seed --workspace=server` against the Aiven connection. Do not use
   Prisma data-loss flags.

## 2. Deploy on Render

1. Push this repository to GitHub and create a Render Blueprint from `render.yaml`.
2. After Render assigns the service URL, set `CLIENT_URL` to that exact HTTPS URL.
3. Set every `sync: false` variable in Render's dashboard. Keep all credentials
   out of Git, build logs, and mobile application configuration.
4. Deploy and verify `https://<render-service>/api/health` before opening the app.

Render's Free service can sleep after idle time. The first request after a sleep
can take about a minute while the service starts.

## 3. Create a private Android APK later

1. Create or sign in to the Expo account that will own this app.
2. In the Expo project environment settings, set `EXPO_PUBLIC_API_URL` to the
   exact Render HTTPS URL for the `preview` build environment.
3. From `apps/mobile`, run `npx eas-cli build:configure` once if EAS asks to link
   the project, then run `npx eas-cli build --platform android --profile preview`.
4. Let Expo create and retain the Android signing keystore. Download the generated
   APK from the EAS build page and share its private install link only with the two
   intended users.

The `preview` profile creates an installable APK. It does not submit anything to
Google Play.

`EXPO_PUBLIC_API_URL` is required for a native build; the APK deliberately has no
localhost fallback.
