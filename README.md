# Amaar Frontend

Production-ready frontend for Amaar smart-city workflows, built with React, TypeScript, Vite, and Tailwind CSS.

Amaar is an Arabic-first reporting and operations dashboard for city improvement reports. It helps admin and authority users review citizen reports, validate AI classifications, assign work, track execution, review submitted fixes, and close completed reports.

## Live Demo

- Production app: https://amaar-frontend-production.up.railway.app/login

## Demo Accounts

Use these accounts to test the production dashboard:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@gmail.com` | `12345678` |
| Authority | `authority@gmail.com` | `12345678` |

## Features

- Arabic-first RTL dashboard designed for city operations teams.
- Secure login, registration, logout, protected routes, and remember-me support.
- Role-aware access for `admin` and `authority` users, so each user sees the workflow that matches their responsibilities.
- Dashboard statistics that summarize the current report workload and operational status counts.
- Report search, filtering, and pagination to help teams find reports by status, priority, type, authority, or keyword.
- Detailed report views with report metadata, description, priority, category, images, map location, AI confidence, and review status.
- AI review workflow where users can approve AI classification or reject it and move the report to human review.
- Human review workflow for correcting report type, changing priority, assigning the right authority, and adding review notes.
- Execution workflow for starting work, rejecting execution with a reason, resolving reports, and closing completed work.
- Fix review workflow for checking submitted fixes, viewing fix details, accepting valid fixes, and rejecting fixes that need more work.
- Interactive map view powered by Leaflet and OpenStreetMap tiles, making report locations easier to inspect visually.
- Light and dark theme support with saved user preference.
- Reliable session handling with automatic token refresh and secure logout behavior.

## Main Workflows

### Report Review

Teams can open each report, inspect its details, check the submitted image and location, review the AI classification, then decide whether the report can continue automatically or needs human correction.

### Human Validation

When AI classification is not enough, authorized users can manually update the report type, priority, assigned authority, and review notes. This keeps the report data clean before execution starts.

### Authority Execution

Authority users can follow assigned reports through the execution process. They can start work, handle rejected execution cases, submit or review fixes, and move reports toward completion.

### Fix Approval

Admins and authority users can inspect submitted fixes, review attached details, approve successful work, or reject fixes that do not solve the issue.

### Map Monitoring

The map page displays report locations as pins so teams can understand where issues are happening and inspect reports geographically instead of only through tables.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router
- React Hook Form
- Zod
- Leaflet

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Configuration

Create a `.env` file only if you want to use a different backend:

```env
VITE_API_BASE_URL=your_backend_url
```

If this value is omitted, the app uses the production backend configured in the source code.
