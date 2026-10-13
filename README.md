# Joy University Smart Campus ERP — Frontend Portal

Frontend single-page application for the Joy University Smart Campus Enterprise Resource Planning (ERP) platform. Built with **React 19**, **Vite**, and **Tailwind CSS 4**.

---

## 1. System Overview & Tech Stack

- **Framework:** React 19 (`react`, `react-dom`)
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS 4 with `@tailwindcss/vite`
- **Icons:** `@heroicons/react`
- **State & Routing:** Role-aware single-page application architecture
- **HTTP Client:** Centralized fetch API client with Bearer token authentication, 401 handling, and auto-sanitization of HTML error pages into clean user notifications.

---

## 2. Portals & Feature Areas

1. **Student Portal:**
   - Profile overview and degree tracking
   - Weekly timetable schedule with active semester isolation
   - Course registration and credits breakdown
   - Granular attendance logs and overall percentage compliance indicators

2. **Faculty Portal:**
   - Weekly teaching schedule
   - Course offerings and assigned section rosters
   - Attendance session lifecycle (Create ➔ Open ➔ Mark Roster ➔ Finalize)
   - Attendance override workflows with audit reason codes
   - Attendance analytics summary

3. **Admin Management Suite:**
   - Institutional Dashboard statistics
   - Student management (CRUD lifecycle, batch assignments)
   - Faculty & Staff management (CRUD lifecycle, departments)
   - Academic Hierarchy (Schools, Departments, Programmes, Batches, Sections)
   - Infrastructure management (Campus Blocks, Classrooms, Labs)
   - Semester Timetable management (Schedule grid with conflict detection)
   - Attendance sessions inspection & institutional reports

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Key Configuration Variables:
```ini
# Base API Endpoint (pointing to backend Express server)
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Authentication & Session Endpoints
VITE_AUTH_LOGIN_ENDPOINT=/auth/login
VITE_AUTH_ME_ENDPOINT=/auth/me
VITE_AUTH_LOGOUT_ENDPOINT=/auth/logout
```

> [!IMPORTANT]
> In production environments, set `VITE_API_BASE_URL` to your production backend domain (e.g. `https://api.erp.joyuniversity.edu.in/api/v1`) rather than `localhost`.

---

## 4. Development & Build Commands

```bash
# Install dependencies using lockfile
npm ci

# Start local development server (HMR enabled on port 5173)
npm run dev

# Run ESLint validation
npm run lint

# Compile production build to /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 5. Verification & Code Quality

- **ESLint:** 0 errors, 0 warnings
- **Production Build:** Vite bundle optimization completed cleanly with tree-shaking and CSS compression.

---

## 6. License

Proprietary — Joy University Smart Campus ERP. All rights reserved.
