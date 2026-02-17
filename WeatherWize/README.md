# WeatherWize

A weather dashboard application refactored to use a Node.js/Express backend and a Vanilla HTML/CSS/JS frontend.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Authentication:** JWT, bcrypt
- **Frontend:** HTML5, Vanilla CSS (Dark Mode), Vanilla JavaScript

## Prerequisites
- Node.js installed
- MySQL Server installed and running

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Database Setup**
    - Create a database (e.g., `weatherwize`) in your MySQL server.
    - Run the SQL commands in `schema.sql` to create the necessary tables (`users`, `saved_locations`).

3.  **Environment Variables**
    - Check the `.env` file and update your MySQL credentials:
        ```env
        DB_HOST=localhost
        DB_USER=root
        DB_PASSWORD=your_password
        DB_NAME=weatherwize
        JWT_SECRET=your_secret_key
        OPENWEATHER_API_KEY=your_api_key
        ```

## Running the Application

Start the server:
```bash
npm start
```
Or for development with auto-reload:
```bash
npm run dev
```

Open your browser to `http://localhost:3000`.

## Features
- User Registration and Login
- Secure Authentication with JWT
- Weather Dashboard
- Save User Preferences (Favorite Locations)
