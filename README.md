# WeatherWize

A full-stack weather application built with **Node.js / Express / Sequelize / EJS / MySQL**. It supports three user roles — General, Advanced, and Admin — each with different feature access.

---

## Table of Contents

- [Quick Start (One-Shot Scripts)](#quick-start-one-shot-scripts)
- [Manual Setup](#manual-setup)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Restore the Database](#4-restore-the-database)
  - [5. Start the Application](#5-start-the-application)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)

---

## Quick Start (One-Shot Scripts)

Two helper scripts perform every setup step — prerequisite checks, `npm install`, database init, port cleanup, and server start — in one command.

### Windows (PowerShell)

```powershell
# Production mode
.\scripts\rebuild.ps1

# Development mode (nodemon auto-reload)
.\scripts\rebuild.ps1 -Dev
```

If PowerShell blocks the script, run once per shell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### macOS / Linux / Git Bash (Bash)

```bash
# Production mode
bash scripts/rebuild.sh

# Development mode (nodemon auto-reload)
bash scripts/rebuild.sh --dev
```

Both scripts will:

1. Verify Node.js v18+ and npm are installed
2. Load `.env` and confirm MySQL is reachable on the configured host/port
3. Run `npm install`
4. Initialize the database via `node database/init.js` (creates schema, seeds defaults)
5. Free the configured port if a previous instance is still bound to it
6. Start the Express server (production or `nodemon` depending on the flag)

Once the server is up, open <http://localhost:3000>.

You still need a populated `.env` file before running either script — see [step 3 below](#3-configure-environment-variables).

---

## Manual Setup

If you'd rather run each step yourself, follow these five steps.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) **v18+** (required for native `fetch`)
- [MySQL](https://www.mysql.com/) **8.0+** running locally (or reachable over the network)
- An [OpenWeatherMap API key](https://openweathermap.org/api) (free tier works)
- *(Optional)* A [Resend](https://resend.com/) API key for outbound alert emails

### 2. Install Dependencies

```bash
git clone https://github.com/your-username/WeatherWize.git
cd WeatherWize
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=weatherwize

# Server
PORT=3000
APP_URL=http://localhost:3000

# Auth
JWT_SECRET=replace_with_a_long_random_string

# External APIs
OPENWEATHER_API_KEY=your_openweather_api_key

# Email (optional — alert emails are skipped if unset)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=WeatherWize Alerts <onboarding@resend.dev>
```

Notes:
- `RESEND_API_KEY` is optional — the app logs a warning and continues without sending alert emails if it is missing.
- `JWT_SECRET` should be a long, random string in any non-trivial deployment.

### 4. Restore the Database

The repo includes the schema in [`database/schema.sql`](database/schema.sql). Two ways to apply it:

**Option A — Sequelize-driven init script (recommended):**

```bash
npm run db:init
```

This runs [`database/init.js`](database/init.js), which creates the `weatherwize` database (if missing), executes `schema.sql`, and ensures all tables and seeded `system_settings` rows are in place.

**Option B — Raw `mysql` client:**

```bash
mysql -u root -p < database/schema.sql
```

Either option produces the same schema: `users`, `saved_locations`, `alerts`, `notifications`, `system_settings`.

### 5. Start the Application

```bash
# Production mode
npm start

# Development mode (auto-reload via nodemon)
npm run dev
```

Then open <http://localhost:3000>.

---

## Features

| Feature | General | Advanced | Admin |
|---|:---:|:---:|:---:|
| Search current weather | ✅ | ✅ | — |
| Hourly & daily forecast | ✅ | ✅ | — |
| Save & manage locations | ✅ | ✅ | — |
| Detailed weather page | ✅ | ✅ | — |
| Radar / precipitation map | — | ✅ | — |
| Weather alerts manager | — | ✅ | — |
| Historical weather query | — | ✅ | — |
| Email alert notifications | — | ✅ | — |
| User profile (edit email/password) | ✅ | ✅ | ✅ |
| Admin dashboard (analytics) | — | — | ✅ |
| Manage users (role, suspend, delete) | — | — | ✅ |
| System settings (maintenance mode, throttle) | — | — | ✅ |

Other behaviors:

- **Auto-login** after registration
- **Password validation** (minimum 6 characters)
- **Username uniqueness** enforced during registration
- **Suspended account** login blocked with a friendly message
- **Confirmation dialogs** before destructive actions (delete location, delete user)
- **Toast notifications** instead of browser alerts
- **Maintenance mode** blocks non-admin access (toggled by admin from the settings page)
- **Card validation** on advanced-user signup (16-digit card number, 3-digit CVV, MM/YY expiry, expiration check)
- **Rate limiting** on `/api/*` (window and limit configurable via `system_settings.api_throttle_limit`)
- **Alerts fire once** then auto-disable; the user must manually re-enable from the Alerts Manager

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **ORM / DB:** Sequelize over `mysql2`, MySQL 8
- **View Engine:** EJS (server-rendered pages in `src/views/`)
- **Auth:** JWT (`jsonwebtoken`), bcrypt
- **Frontend:** Vanilla HTML/CSS/JS, Leaflet.js (maps), Chart.js (charts)
- **Email:** Resend SDK (alert notifications)
- **External APIs:** OpenWeatherMap (geocoding, current/forecast/history), RainViewer (radar tiles)

---

## Project Structure

```
WeatherWize/
├── package.json                 # npm scripts: start, dev, db:init
├── README.md                    # this file
├── .env                         # environment variables (not committed)
│
├── database/
│   ├── schema.sql               # MySQL schema (users, saved_locations, alerts, notifications, system_settings)
│   └── init.js                  # Programmatic DB initialization (creates DB + runs schema.sql)
│
├── scripts/
│   ├── rebuild.ps1              # PowerShell one-shot setup + run
│   └── rebuild.sh               # Bash one-shot setup + run
│
├── src/
│   ├── server.js                # Express app entry point, middleware, route mounting
│   │
│   ├── config/
│   │   ├── db.js                # mysql2 connection pool (legacy, used by init script)
│   │   ├── sequelize.js         # Sequelize instance
│   │   └── state.js             # Shared in-memory state (e.g. rate-limit window)
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verify + role guard (requireRole)
│   │   ├── maintenanceMiddleware.js  # Blocks non-admins when maintenance_mode is ON
│   │   └── validationMiddleware.js   # express-validator rules for register/login/alerts
│   │
│   ├── models/                  # Sequelize models
│   │   ├── User.js
│   │   ├── Location.js
│   │   ├── Alert.js
│   │   ├── Notification.js
│   │   ├── Setting.js
│   │   └── index.js             # Associations + exports
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── weatherController.js
│   │   ├── alertsController.js
│   │   └── settingsController.js
│   │
│   ├── routes/
│   │   ├── auth.js              # /api/auth/*     — auth + admin user routes
│   │   ├── weather.js           # /api/weather/*  — weather data + saved locations
│   │   ├── alerts.js            # /api/alerts/*   — alerts (advanced/admin) + notifications
│   │   └── settings.js          # /api/settings/* — system settings (admin only)
│   │
│   ├── services/
│   │   ├── weatherService.js    # OpenWeather geocoding + current weather helpers
│   │   ├── alertWorker.js       # node-cron poller that evaluates alerts and creates notifications
│   │   └── emailService.js      # Resend wrapper for alert emails
│   │
│   ├── views/                   # EJS templates rendered by the server
│   │   ├── index.ejs            # Login page
│   │   ├── dashboard*.ejs       # Role-based dashboards
│   │   ├── alerts-manager.ejs
│   │   ├── admin-*.ejs
│   │   └── ...
│   │
│   └── public/                  # Static assets (CSS, client JS, images)
│       ├── css/
│       ├── js/
│       └── images/
│
└── tests/                       # Test files
```

---

## User Roles

| Role | Access |
|------|--------|
| **General** | Basic weather search, hourly/daily forecast, save locations, profile |
| **Advanced** | Everything General gets, plus radar map, weather alerts, email notifications, historical data |
| **Admin** | Admin dashboard, user management, system settings, profile (no saved locations, no self-deletion) |

---

## License

This project was built for CS 489 at Washington State University.
