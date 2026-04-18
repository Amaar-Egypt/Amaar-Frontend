# Amaar Frontend

Production-ready frontend for Amaar smart-city workflows, built with React + TypeScript + Vite + TailwindCSS.

## Highlights

- Arabic-first RTL experience with premium dark UI style.
- Full authentication flow (Register + Login) with role-aware routing.
- Authority dashboard with:
  - Right sidebar navigation (default active page: `الرئيسية`)
  - Statistics cards
  - Search and status filters
  - Reports table with approve/reject actions
- Reusable service + hook architecture for backend integration.
- Global dark/light theme system (dark default) with persistent user preference.

## Tech Stack

- React 19
- TypeScript
- Vite
- TailwindCSS
- Axios
- React Router
- React Hook Form + Zod

## Folder Structure

```text
src/
  assets/
  components/
    BrandLogo.tsx
    ThemeToggle.tsx
    dashboard/
      DashboardSidebar.tsx
      DashboardTopbar.tsx
      ReportsFilters.tsx
      ReportsTable.tsx
      StatCard.tsx
    form/
      TextField.tsx
    routing/
      ProtectedRoute.tsx
  context/
    AppProviders.tsx
    AuthContext.tsx
    ThemeContext.tsx
    auth-context.ts
    theme-context.ts
  hooks/
    useAuth.ts
    useAuthorityReports.ts
    useLogin.ts
    useRegister.ts
    useTheme.ts
  layout/
    AuthLayout.tsx
  pages/
    Dashboard/
      index.tsx
    ForgotPassword/
      index.tsx
    Login/
      index.tsx
    Register/
      index.tsx
  services/
    apiClient.ts
    authService.ts
    authStorage.ts
    authTokenManager.ts
    reportService.ts
  types/
    auth.ts
    report.ts
  utils/
    jwt.ts
    reportPresentation.ts
  App.tsx
  index.css
  main.tsx
```

## Dashboard Architecture

The authority dashboard is built with a scalable layered approach:

- `pages/Dashboard/index.tsx`
  - Orchestrates page-level state (active section, filter tab, search).
  - Composes reusable dashboard components.
- `hooks/useAuthorityReports.ts`
  - Handles fetching reports, loading states, action states, and optimistic updates.
- `services/reportService.ts`
  - Encapsulates all report endpoints and response normalization.
- `components/dashboard/*`
  - Keeps UI blocks modular (sidebar, topbar, stats, filters, table).

## Auth Flow

1. User logs in from `Login` page.
2. `useLogin` calls `/auth/login` and extracts `accessToken`, `refreshToken`, and user info.
3. `AuthContext` starts the session and persists it (`sessionStorage` or `localStorage` with Remember Me).
4. `ProtectedRoute` blocks unauthorized access.
5. Role-based access:
   - `authority` and `admin` -> redirected to `/dashboard`
   - other roles -> kept away from authority dashboard
6. API 401 responses trigger centralized session cleanup and redirect flow.

## Theme System

- Global provider: `ThemeContext`.
- Default mode: `dark`.
- Toggle component: `ThemeToggle`.
- Persistence: `localStorage` (`amaar.ui.theme`).
- Tailwind dark mode strategy: class-based (`darkMode: 'class'`).

## API Integration

Base URL (default):

`https://amaarbackend-production.up.railway.app`

Auth endpoints used:

- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`

Report endpoints used:

- `GET /reports`
- `GET /reports/{id}`
- `PATCH /reports/{id}/accept`
- `PATCH /reports/{id}/reject`
- `PATCH /reports/{id}`

## Run Locally

```bash
npm install
npm run dev
```

For production build:

```bash
npm run build
npm run preview
```

## Environment Variables

Optional override:

```env
VITE_API_BASE_URL=https://amaarbackend-production.up.railway.app
```

If omitted, the app falls back to the production Amaar backend URL above.
