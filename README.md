# Amaar Frontend - Register Flow

Production-ready React + TypeScript frontend for user registration in the Amaar platform.

The current implementation delivers a complete Arabic Register page with:

- Modern dark UI with glassmorphism card
- Client-side form validation using React Hook Form + Zod
- API integration using Axios
- Success/error handling and redirect flow

## Project Overview

This project is built with Vite and follows a scalable architecture that separates UI, business logic, and API access.

The Register flow submits user data to:

`POST https://amaarbackend-production.up.railway.app/auth/register`

On success, the user sees a success message then is redirected to the login route.
On failure, the backend message is displayed directly in the form.

## Folder Structure

```text
src/
  assets/
  components/
    BrandLogo.tsx
    form/
      TextField.tsx
  context/
    AppProviders.tsx
  hooks/
    useRegister.ts
  layout/
    AuthLayout.tsx
  pages/
    Login/
      index.tsx
    Register/
      index.tsx
  services/
    apiClient.ts
    authService.ts
  App.tsx
  main.tsx
  index.css
```

### Why this structure?

- `components`: reusable UI units (inputs, logo, shared visual building blocks).
- `pages`: route-level screens (Register and Login pages).
- `services`: external communication layer (Axios client and auth endpoints).
- `hooks`: reusable stateful/business logic (`useRegister`) away from JSX.
- `context`: app-wide providers and shared state containers (scales well for auth/theme later).
- `layout`: shared page shells and structural wrappers (`AuthLayout`) for consistency.

## How Register Flow Works

1. **Form (UI Layer)**  
   `src/pages/Register/index.tsx` renders fields for name, email, password, confirm password, and phone.

2. **Validation (Client Layer)**  
   Zod schema validates required fields, email format, password length, phone format, and password confirmation match.

3. **Hook (Feature Logic Layer)**  
   `src/hooks/useRegister.ts` handles loading state, errors, and the register action lifecycle.

4. **Service (API Layer)**  
   `src/services/authService.ts` exposes `register(data)` and sends a `POST /auth/register` request using Axios.

5. **Result Handling (UX Layer)**  
   Success -> show confirmation + redirect to `/login`.  
   Error -> show backend-provided message.

## Request Payload

The register endpoint is called with:

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string",
  "phone": "string"
}
```

## How to Run the Project

```bash
npm install
npm run dev
```

Open the app at the URL shown by Vite (usually `http://localhost:5173`).

## Environment Configuration

Optional: create a `.env` file to override API base URL.

```env
VITE_API_BASE_URL=https://amaarbackend-production.up.railway.app
```

If not provided, the same production URL is used by default.

## Best Practices Used

- **Separation of concerns**: page UI, hook logic, and API services are independent.
- **Reusability**: reusable `TextField` and layout components reduce duplication.
- **Clean architecture**: predictable folders and route-level composition.
- **Type safety**: strict TypeScript interfaces and inferred Zod form types.
- **Production UX**: clear loading, success, and error states with graceful navigation.
