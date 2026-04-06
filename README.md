# Audio & Video Knowledge Archiver

Audio & Video Knowledge Archiver is a local-first MVP for collecting audio and video knowledge as structured cards. Users can create records from links, pasted text, or manual input, then ask AI to organize the supplied text into reusable notes.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Dexie, Zustand
- Backend: Node.js, Express, OpenAI official Node SDK
- Storage: IndexedDB via Dexie
- Export: HTML to PDF with `html2pdf.js`

## Requirements

- Recommended Node.js: `20 LTS` or `22 LTS`
- Minimum supported Node.js: `>=20`

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment files:

   ```bash
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

3. Fill in `server/.env` with your `OPENAI_API_KEY`.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open the frontend at `http://localhost:5173`.

## Scripts

- `npm run dev`: run client and server in parallel
- `npm run build`: build client and server
- `npm run typecheck`: run TypeScript checks
- `npm run test`: run frontend and backend tests

## Notes

- All records, folders, and tags are stored locally in IndexedDB.
- The backend only provides health checks and AI analysis; it does not store records.
- AI outputs must be based only on user-provided text. If the raw text is too short, the server rejects the request.
