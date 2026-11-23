# Google Apps Script integration — implementation foundation

**Status: NOT LIVE.** This directory is server-side source code only. No Apps Script deployment URL, Spreadsheet ID, Calendar IDs, credentials, or employee data are stored in the public GitHub repository.

## Intended data ownership

- **Employees** (Google Sheets): employee ID, department, display name, work email, active flag; manually maintained by the sole manager.
- **Bookings** (Google Sheets): application booking IDs, ownership, Google Calendar event ID, timestamps, and state.
- **Audit** (Google Sheets): create/edit/cancel audit trail, accessible only to the manager.
- **Five separate Google Calendars**: authoritative room availability and calendar events, all owned/managed by one manager account.

## Security blocker: employee ID is not authentication

An employee ID is an identifier and is often guessable. If a publicly accessible Apps Script web app accepts an employee ID as proof of identity, any person who knows or guesses an ID could create, modify, or cancel that employee's bookings.

**Do not activate write endpoints until a second proof of identity is selected.** Recommended option: verify a one-time code delivered to the work email already registered in the manager-controlled Employees sheet; use a short-lived, server-validated session, rate limits, and anti-replay protection. Another option is verified Google sign-in with a suitable identity-aware backend. Neither is implemented yet.

## Cross-origin transport blocker

GitHub Pages and Apps Script Web Apps are different origins. Apps Script ContentService cannot be assumed to provide the required CORS behavior for a normal `fetch` JSON API. Do not bypass this with a `no-cors` request: the frontend cannot reliably determine whether a booking succeeded. Before enabling production, choose and test a secure transport (for example a same-origin backend proxy, or an explicitly designed Apps Script HTMLService bridge with origin and session verification).

## Concurrency

The internal `createBookingForVerifiedEmployee_` service uses `LockService` and re-reads the target Calendar within the lock, immediately before writing. This protects against simultaneous bookings *through the same Apps Script deployment*. It does **not** guarantee atomicity against events created directly in Google Calendar or by another integration. Keep calendar editing restricted and design reconciliation/exception handling.

## Setup (manager only, after security design approval)

1. Create a private Google Sheet with **Employees**, **Bookings**, and **Audit** tabs.
2. In Apps Script **Script Properties**, set `SPREADSHEET_ID` and the five `CAL_*` identifiers. Never commit real values.
3. Run `initializeStorage` as the manager and populate Employees manually.
4. Grant the manager account access to all five calendars; staff may have view/subscribe rights only.
5. Implement and test authentication, session ownership checks, update/cancel, recurrence, transport, error handling, and reconciliation **before** enabling public endpoints.
6. Confirm permissions, quotas, audit retention, and backup/recovery policy.

Current `doPost` and `doGet` deliberately return a disabled response. No employee data or calendar modification is possible through these endpoints.

## Frontend release safety

The current GitHub Pages frontend continues using `localStorage` simulation until an authenticated backend is integrated and end-to-end tested. Never present localStorage bookings as real cross-user availability.
