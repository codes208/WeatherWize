# WeatherWize 🌦️

A full-stack weather application built with **Node.js / Express** and vanilla **HTML / CSS / JavaScript**. It supports three user roles — General, Advanced, and Admin — each with different feature access.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [User Roles](#user-roles)

---

## Features

| Feature | General | Advanced | Admin |
|---|:---:|:---:|:---:|
| Search current weather | ✅ | ✅ | — |
| View hourly forecast | ✅ | ✅ | — |
| Save & manage locations | ✅ | ✅ | — |
| Radar / precipitation map | — | ✅ | — |
| Weather alerts manager | — | ✅ | — |
| Historical weather query | — | ✅ | — |
| Detailed weather page | ✅ | ✅ | — |
| User profile (edit email/password) | ✅ | ✅ | ✅ |
| Admin dashboard (analytics) | — | — | ✅ |
| Manage users (role, suspend) | — | — | ✅ |
| System settings (maintenance mode) | — | — | ✅ |

- **Auto-login** after registration
- **Password validation** (minimum 6 characters)
- **Email uniqueness** enforced during registration
- **Suspended account** login blocked
- **Confirmation dialogs** before destructive actions (delete location, suspend user)
- **Search bar** on admin user management table
- **Toast notifications** instead of browser alerts
- **Maintenance mode** blocks non-admin access (toggled by admin)
- **Card validation** (16-digit card number, 3-digit CVV, MM/YY expiry, expiration check)

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL (via `mysql2`)
- **Auth:** JWT (`jsonwebtoken`), bcrypt
- **Frontend:** Vanilla HTML/CSS/JS, Leaflet.js (maps), Chart.js (charts)
- **APIs:** OpenWeatherMap (geocoding + weather), RainViewer (radar tiles)

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [MySQL](https://www.mysql.com/) 8.0+
- An [OpenWeatherMap API key](https://openweathermap.org/api) (free tier works)

---

## Installation

```bash
git clone https://github.com/your-username/WeatherWize.git
cd WeatherWize
npm install
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=weatherwize
JWT_SECRET=your_jwt_secret_key
OPENWEATHER_API_KEY=your_openweather_api_key
PORT=3000
```

---

## Database Setup

1. Create the database and tables:
```bash
mysql -u root -p < schema.sql
```

2. Or use the init script:
```bash
npm run db:init
```

---

## Running the App

```bash
# Development (auto-reload with nodemon)
npm run dev

# Production
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
WeatherWize/
├── server.js                  # Express app entry point, middleware, route mounting
├── package.json               # Dependencies and npm scripts
├── schema.sql                 # MySQL schema (users, saved_locations, alerts, system_settings)
├── init-db.js                 # Programmatic DB initialization script
├── .env                       # Environment variables (not committed)
│
├── config/
│   └── db.js                  # MySQL connection pool (mysql2/promise)
│
├── middleware/
│   └── authMiddleware.js      # JWT auth middleware + role-based access control
│
├── controllers/
│   ├── authController.js      # Registration, login, profile, user management, admin stats
│   ├── weatherController.js   # Weather search, coordinate resolution helper, map tiles
│   ├── alertsController.js    # Create, list, delete weather alerts, get notifications
│   └── settingsController.js  # Get/update system settings (maintenance mode, API limits)
│
├── routes/
│   ├── auth.js                # /api/auth/*   — auth and admin user routes
│   ├── weather.js             # /api/weather/* — weather data and location routes
│   ├── alerts.js              # /api/alerts/*  — weather alert routes (advanced/admin only)
│   └── settings.js            # /api/settings/* — system settings routes (admin only)
│
└── public/                    # Static frontend served by Express
    ├── index.html                 # Login page
    ├── register-general-user.html # General user registration
    ├── register-advanced-user.html# Advanced user registration (with payment form)
    ├── select-account-type.html   # Account type selection
    ├── forgot-password.html       # Forgot password form
    ├── dashboard.html             # General user dashboard
    ├── advanced-dashboard.html    # Advanced user dashboard (+ radar map, alerts links)
    ├── admin-dashboard.html       # Admin dashboard (analytics, user management links)
    ├── admin-users.html           # Admin user management table with search
    ├── locations.html             # Manage saved locations
    ├── map.html                   # Radar / precipitation map (Leaflet + RainViewer)
    ├── alerts-manager.html        # Weather alerts manager (advanced only)
    ├── historical-data.html       # Historical weather query (advanced only)
    ├── weather-details.html       # Detailed weather view for a city
    ├── profile.html               # User profile (edit email/password)
    ├── settings.html              # Admin system settings
    │
    ├── css/
    │   ├── style.css              # Core design system (layout, components, animations)
    │   └── weatherWize.CSS        # Page-specific weather styles
    ├── js/
    │   ├── auth.js                # Login/register form logic, card validation, auto-login
    │   ├── auth-check.js          # JWT guard, role-based redirects, notification polling
    │   ├── weather-dashboard.js   # Unified dashboard logic: maps, locations, hourly reports
    │   ├── admin-dashboard.js     # Admin dashboard: fetch and display platform analytics
    │   ├── admin.js               # Admin user table: load, render, search, role change, suspend
    │   ├── locations.js           # Manage locations: list, add, delete with confirmation
    │   ├── map.js                 # Leaflet map + RainViewer radar tile playback
    │   ├── alerts-manager.js      # Create, list, delete weather alerts
    │   ├── historical-data.js     # Historical weather chart (Chart.js)
    │   ├── weather-details.js     # Detailed weather page logic
    │   ├── profile.js             # Profile form: update email/password, hide delete for admin
    │   ├── settings.js            # Admin settings form: maintenance mode, API limits
    │   └── toast.js               # Shared toast notification utility (success/error/warning/info)
    │
    └── images/                    # Logo and static assets
```

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register a new user (general or advanced) |
| POST | `/login` | — | Login, returns JWT + user object |
| POST | `/forgot-password` | — | Forgot password request |
| PUT | `/profile` | JWT | Update own email/password |
| GET | `/users` | Admin | List all users |
| GET | `/stats` | Admin | Dashboard analytics (counts) |
| PUT | `/users/:id/role` | Admin | Change a user's role |
| PUT | `/users/:id/status` | Admin | Suspend / unsuspend a user |

### Weather (`/api/weather`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | Current weather by city name |
| GET | `/hourly` | JWT | 5-day / 3-hour forecast |
| GET | `/history` | Advanced | Historical weather query |
| GET | `/tiles/:layer/:z/:x/:y` | — | Proxy OpenWeather map tiles |
| POST | `/save` | JWT | Save a location (geocoded) |
| GET | `/saved` | JWT | List saved locations |
| DELETE | `/saved/:id` | JWT | Delete a saved location |

### Alerts & Notifications (`/api/alerts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Advanced | Create a weather alert |
| GET | `/` | Advanced | List user's alerts |
| DELETE | `/:id` | Advanced | Delete an alert |
| GET | `/notifications` | Advanced | Fetch unread notifications |
| POST | `/notifications/read` | Advanced | Mark notifications loaded |

### Settings (`/api/settings`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | Get all system settings |
| PUT | `/` | Admin | Update system settings |

---

## User Roles

| Role | Access |
|------|--------|
| **General** | Basic weather search, hourly forecast, save locations, profile |
| **Advanced** | Everything General gets + radar map, weather alerts, historical data |
| **Admin** | Admin dashboard, user management, system settings, profile (no locations, no account deletion) |

---

## License

This project was built for CS 489 at Washington State University.
