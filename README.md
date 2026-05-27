# Dorm Rental System

## Tech Stack
- Vue 3 + Vite + TypeScript
- Tailwind CSS
- Pinia
- Vue Router
- Google Apps Script / Google Sheet API backend

## Setup
1. Install:
   - `npm install`
2. Create env:
   - copy `.env.example` to `.env`
   - set `VITE_SHEETS_API_URL`
3. Run:
   - `npm run dev`

## Date rule
- Students can choose any borrow date.
- Return date must be after borrow date and within 7 days.

## Deployment (GitHub Pages)
1. Push to `main`.
2. Add repository secret:
   - `VITE_SHEETS_API_URL`
3. Enable Pages in GitHub repo settings (Build and deployment: GitHub Actions).

## API contract (example)
- `GET /borrow-applications` -> `BorrowApplication[]`
- `GET /borrow-records` -> `BorrowRecord[]`
- `POST /borrow-applications` -> `{ ok: boolean, applicationId: string }`
