# Deliverable 1: Requirements Analysis

## Project Overview

**WeatherWize** is a comprehensive weather forecasting and location management web application. The platform provides localized real-time weather data, forecasts, and condition alerts to users. It supports basic access to weather information for standard users, extended analytical tools (like historical data and advanced alerts) for premium/advanced users, and a comprehensive management interface for administrators to oversee the system, its users, and its content.

## User Roles

The application supports three distinct user roles, each with increasing levels of access and specific capabilities:

1.  **General User (Primary Role):** Can register, log in, view current weather, search for locations, and save a limited number of favorite locations to their personal dashboard.
2.  **Advanced User (Secondary Role):** A premium tier that includes all capabilities of a General User, plus access to historical weather insights, an advanced dashboard, and the ability to set up custom severe weather alerts.
3.  **Administrator (Admin Role):** A staff role responsible for managing the platform. Admins can view system-wide analytics, manage user accounts (edit roles, suspend users), and resolve technical issues or disputes concerning location data or system performance.

---

## Use Cases

### User Account & Authentication

#### Use Case 1: Register General Account
*   **Use Case ID:** UC-001
*   **Name:** Register General Account
*   **Actor:** Unregistered User
*   **Description:** A new user creates a free "General" account to save locations.
*   **Pre-conditions:** The user is on the registration page and is not logged in to any account.
*   **Post-conditions:** A new user account is created with the role "general" in the database, and the user is redirected to the dashboard logged in.
*   **Main Flow:**
    1. The user navigates to the registration portal and selects "General Account".
    2. The system presents the General Account registration form.
    3. The user enters a unique username, a valid email address, and a secure password.
    4. The user clicks the "Submit" button.
    5. The system validates the input formats and checks if the username or email already exists in the database.
    6. The system securely hashes the password.
    7. The system saves the new account record to the database with the "general" role.
    8. The system automatically authenticates the user and establishes a session.
    9. The system redirects the user to the General Dashboard.
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 5a (Username/Email exists):* The system detects the username or email is already registered. The system displays an error message "Username or email is already taken" and prompts the user to choose another or log in. The use case restarts at step 3.
    *   *Step 5b (Invalid password format):* The system detects the password does not meet security criteria. The system displays an error specifying the requirements. The use case restarts at step 3.

#### Use Case 2: Register Advanced Account
*   **Use Case ID:** UC-002
*   **Name:** Register Advanced Account
*   **Actor:** Unregistered User
*   **Description:** A new user creates a premium "Advanced" account to access historical data and alerts.
*   **Pre-conditions:** The user is on the registration page and is not logged in.
*   **Post-conditions:** A new user account is created with the role "advanced" in the database.
*   **Main Flow:**
    1. The user navigates to the registration portal and selects "Advanced Account".
    2. The system presents the Advanced Account registration and billing form.
    3. The user enters their credentials and acknowledges the premium terms.
    4. The user clicks "Submit".
    5. The system validates the input and uniqueness.
    6. The system creates the account with the "advanced" role flag.
    7. The system redirects the user to the Advanced Dashboard.
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 5a (Validation failure):* Same as UC-001 Exception Flows.

#### Use Case 3: User Login
*   **Use Case ID:** UC-003
*   **Name:** User Login
*   **Actor:** General User, Advanced User, Admin
*   **Description:** An existing user authenticates into the system to access their specific dashboard and tools.
*   **Pre-conditions:** The user has a valid, active account and is on the login page.
*   **Post-conditions:** The user is successfully authenticated and receives an active session token.
*   **Main Flow:**
    1. The user navigates to the login screen.
    2. The user enters their username and password.
    3. The user clicks the "Login" button.
    4. The system queries the database to verify the credentials.
    5. The system checks the user's assigned role and account status.
    6. The system generates a JWT token and logs the user in.
    7. The system redirects the user to the dashboard corresponding to their role (General Dashboard, Advanced Dashboard, or Admin Dashboard).
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 4a (Invalid Credentials):* The system rejects the login attempt. The system displays "Invalid username or password." The user is prompted to try again.
    *   *Step 5a (Account Suspended):* The system detects the account is marked as inactive or suspended. The system denies entry and displays "This account has been suspended by an administrator."

#### Use Case 4: Forgot Password / Password Reset
*   **Use Case ID:** UC-004
*   **Name:** Request Password Reset
*   **Actor:** General User, Advanced User
*   **Description:** A user initiates a password reset flow if they have forgotten their password and cannot log in.
*   **Pre-conditions:** The user is on the forgot password screen and is not logged in.
*   **Post-conditions:** A secure reset token is generated and an email is dispatched to the user.
*   **Main Flow:**
    1. The user navigates to the "Forgot Password" screen from the login portal.
    2. The user enters the email address associated with their account.
    3. The user submits the request by clicking "Send Reset Link".
    4. The system queries the database to check if the email exists.
    5. The system generates a time-sensitive, secure reset token.
    6. The system sends a password recovery email containing the token link to the user.
    7. The system displays a confirmation message on the screen indicating an email has been sent.
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 4a (Email not found):* To prevent email enumeration attacks, the system does not explicitly state the email was not found. It proceeds to step 7, displaying the standard generic success message.

### Core Functions (General & Advanced Users)

#### Use Case 5: View Current Weather Dashboard
*   **Use Case ID:** UC-005
*   **Name:** View Current Weather Dashboard
*   **Actor:** General User, Advanced User
*   **Description:** The user views their primary dashboard containing real-time current weather for their customized saved locations.
*   **Pre-conditions:** The user is successfully authenticated.
*   **Post-conditions:** The system accurately displays the latest weather data for the user's specific locations.
*   **Main Flow:**
    1. The user navigates to their respective Dashboard URL after login.
    2. The system queries the database to retrieve the list of locations saved by this specific user.
    3. The system makes external API calls to OpenWeather API to fetch real-time weather data for each location.
    4. The system processes the JSON response from the API.
    5. The system renders the weather cards, populating them with temperature, conditions, and icons, on the dashboard screen.
*   **Alternative Flows:**
    *   *Step 2a (No Locations Saved):* The system detects the user has 0 saved locations. Instead of proceeding to step 3, the system renders an "Empty State" message on the dashboard, encouraging the user to use the search bar to add their first city.
*   **Exception Flows:**
    *   *Step 3a (External API Error/Timeout):* The OpenWeather API fails to respond or returns a 500 error. The system catches the error. The system renders the dashboard but displays a warning banner or substitutes the missing card data with "Unable to fetch the latest weather data. Please try again later."

#### Use Case 6: Search & Add New Location
*   **Use Case ID:** UC-006
*   **Name:** Search & Add New Location
*   **Actor:** General User, Advanced User
*   **Description:** The user searches for a new city by name and saves it to continually monitor its weather on their dashboard.
*   **Pre-conditions:** The user is logged in.
*   **Post-conditions:** A new location record is permanently linked to the user's profile in the database.
*   **Main Flow:**
    1. The user selects the search bar on the Dashboard.
    2. The user types the name of a city (e.g., "Chicago").
    3. The user clicks the "Search" button or presses Enter.
    4. The system queries the geocoding/weather API for the provided string.
    5. The API returns valid coordinates and standardized location data.
    6. The system executes a database insert, creating a new record linking the user ID to the location data.
    7. The system dynamically updates the dashboard UI to include the newly fetched weather card without requiring a full page reload.
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 5a (City Not Found by API):* The geocoding API does not recognize the input string. The system halts the creation process and displays a localized error message near the search bar: "Location not found. Please check the spelling."

#### Use Case 7: Delete Saved Location
*   **Use Case ID:** UC-007
*   **Name:** Delete Saved Location
*   **Actor:** General User, Advanced User
*   **Description:** The user removes a previously saved city from their customized dashboard view.
*   **Pre-conditions:** The user is logged in and currently has at least one saved location populating their dashboard.
*   **Post-conditions:** The specific location record is permanently deleted from the database for that user.
*   **Main Flow:**
    1. The user hovers over an existing weather card on the dashboard or navigates to the "Manage Locations" view.
    2. The user clicks the designated "X" or "Remove" button for a specific location.
    3. The system prompts the user with a confirmation modal: "Are you sure you want to remove this location?"
    4. The user clicks "Confirm".
    5. The system executes a DELETE query in the database for that user ID and location ID.
    6. The system confirms deletion internally and dynamically removes the HTML element representing the weather card from the DOM.
*   **Alternative Flows:**
    *   *Step 4a (User cancels):* The user clicks "Cancel" on the confirmation modal. The modal closes and no data is deleted. The flow ends.
*   **Exception Flows:**
    *   *Step 5a (Database Error):* The database fails to execute the delete command due to a connection drop or constraint failure. The system aborts step 6 and displays a notification toast: "An error occurred while deleting the location. Please refresh and try again."

#### Use Case 8: View Detailed Hourly Forecast
*   **Use Case ID:** UC-008
*   **Name:** View Detailed Hourly Forecast
*   **Actor:** General User, Advanced User
*   **Description:** The user clicks on a specific summary weather card to drill down and see an expanded, detailed hourly forecast for that specific city.
*   **Pre-conditions:** The user is logged in and viewing their dashboard.
*   **Post-conditions:** The system successfully navigates to a new view and displays detailed meteorological data for the upcoming 24-48 hours.
*   **Main Flow:**
    1. The user clicks anywhere on the main body of a specific location's weather card on the dashboard.
    2. The system initiates a navigation action to the `weather-details.html` screen, passing the location ID as a parameter.
    3. The system executes a detailed "OneCall" or hourly forecast API request to OpenWeather for the specific coordinates.
    4. The system parses the complex array of hourly data.
    5. The system renders the detailed view, including the current large temperature display and a horizontal scrollable grid of hourly forecast cards.
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 3a (API Rate Limit/Tier Error):* The API request fails because the application has exceeded its external quota. The system renders the detailed page frame but displays a fallback message in the hourly section: "Detailed forecast is temporarily unavailable due to high system load."

### Advanced Features (Advanced User Only)

#### Use Case 9: Access Historical Weather Data
*   **Use Case ID:** UC-009
*   **Name:** Query Historical Weather Data
*   **Actor:** Advanced User
*   **Description:** The premium user queries archived, past weather data for research, agricultural planning, or comparison purposes.
*   **Pre-conditions:** The user is authenticated specifically with the "advanced" role.
*   **Post-conditions:** The system generates and displays a visual graph or data table of historical temperatures for a selected date range.
*   **Main Flow:**
    1. The user navigates to the Historical Data screen by clicking the corresponding link in the Advanced Dashboard navigation.
    2. The system renders the Historical Query interface.
    3. The user selects a specific location from a dropdown of their saved cities.
    4. The user selects a start date and an end date using the calendar input fields.
    5. The user clicks "Fetch History".
    6. The system initiates a specialized historical database query or historical API call.
    7. The system receives the time-series data.
    8. The system processes the data points and renders a line chart visual analytics widget on the screen.
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 1a (Unauthorized Access):* A General User attempts to access the URL directly. The system middleware intercepts the request, verifies the role is lacking, redirects the user to the General Dashboard, and displays a toast message: "Premium feature. Please upgrade your account to access historical insights."
    *   *Step 4a (Invalid Date Range):* The user selects an end date that occurs before the start date. The system prevents submission and outlines the date fields in red, displaying "End date must be after start date."

#### Use Case 10: Configure Severe Weather Alerts
*   **Use Case ID:** UC-010
*   **Name:** Configure Severe Weather Alerts
*   **Actor:** Advanced User
*   **Description:** The premium user establishes custom, automated alerts based on specific meteorological triggers (e.g., "Notify me if the temperature drops below freezing").
*   **Pre-conditions:** The user is authenticated as an Advanced User.
*   **Post-conditions:** A new alert preference rule is successfully serialized and saved to the database, marking it active for background processing.
*   **Main Flow:**
    1. The user clicks "Manage Alerts" in the navigation and routes to the Alerts Manager screen.
    2. The user uses the form to select one of their saved locations from a dropdown.
    3. The user selects an "Alert Trigger Type" (e.g., "Temperature drops below").
    4. The user inputs a numerical "Threshold Value" (e.g., "32").
    5. The user clicks "Save Alert".
    6. The system validates the inputs to ensure the threshold is a valid number for the chosen condition.
    7. The system saves the alert rule configuration to the database linked to the user's ID.
    8. The system updates the UI, prepending the new alert to the "Active Alerts" list below the form, and shows a success notification.
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 6a (Missing Data):* The user leaves the Threshold Value blank. The system blocks submission and prompts "Please enter a threshold value."

### Administrator Functions (Admin Role)

#### Use Case 11: Access Admin Dashboard Analytics
*   **Use Case ID:** UC-011
*   **Name:** Access Admin Dashboard Analytics
*   **Actor:** Admin
*   **Description:** The system administrator views high-level, aggregated metrics of the entire WeatherWize platform to monitor health and usage.
*   **Pre-conditions:** The user is authenticated and holds the "admin" role.
*   **Post-conditions:** The system securely aggregates and displays sensitive platform analytics.
*   **Main Flow:**
    1. The Admin successfully completes the login process.
    2. The system evaluates the JWT token and confirms the "admin" role.
    3. The system automatically routes the user to the Admin Dashboard screen.
    4. The system executes complex aggregation queries against the database to calculate total active users, daily API calls, and premium subscriber counts.
    5. The system renders these key performance indicators (KPIs) in large overview panels on the dashboard.
    6. The system fetches and renders a list of recent automated "System Alerts" (e.g., API spikes).
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 2a (Unauthorized Access Attempt):* A General or Advanced user attempts to manually navigate to `/admin-dashboard.html`. The authorization middleware detects the insufficient role. The system immediately redirects the request back to the root `index.html` and issues a 403 Forbidden status, logging the incident.

#### Use Case 12: Manage User Roles (Promote/Demote)
*   **Use Case ID:** UC-012
*   **Name:** Manage User Roles
*   **Actor:** Admin
*   **Description:** The administrator manually intervenes to modify the permission role of an existing user (e.g., manually granting someone Advanced status to resolve a billing complaint).
*   **Pre-conditions:** The Admin is authenticated and currently viewing the "User Management" screen.
*   **Post-conditions:** The target user's role string is updated in the core database record.
*   **Main Flow:**
    1. The Admin navigates to the "Manage Users" screen.
    2. The Admin utilizes the search bar to locate a specific user by username.
    3. In the data table row corresponding to the user, the Admin clicks the "Role" dropdown select menu.
    4. The Admin selects a new role (e.g., from "General" to "Advanced").
    5. The Admin clicks the "Save Role" button located in the Actions column.
    6. The system transmits the update to the server.
    7. The system updates the `role` enum field for that User ID in the database.
    8. The system responds with a 200 OK, and the UI displays a green success toast message confirming the change.
*   **Alternative Flows:** None.
*   **Exception Flows:**
    *   *Step 7a (Self-Demotion Attempt):* The Admin attempts to change their own role to "General". The system backend logic intercepts this specific update request, prevents the database mutation, and returns an error. The UI displays "Action prohibited: You cannot demote your own administrative account to prevent system lockouts."

#### Use Case 13: Ban/Suspend User Account
*   **Use Case ID:** UC-013
*   **Name:** Suspend User Account
*   **Actor:** Admin
*   **Description:** The administrator blacklists a user account, disabling their access due to terms of service violations (such as rapid automated API scraping abuse).
*   **Pre-conditions:** The Admin is authenticated and on the User Management screen.
*   **Post-conditions:** The target user's account is marked as suspended, and active sessions are invalidated.
*   **Main Flow:**
    1. The Admin locates the offending user in the User Management table.
    2. The Admin clicks the red "Suspend" button in the Actions column.
    3. The system presents a modal dialogue requiring confirmation of this destructive action.
    4. The Admin clicks "Confirm Suspension".
    5. The system updates the database, setting an `is_suspended` flag to TRUE for that User ID.
    6. The system blacklists the user's current JWT token strings, immediately terminating their active session.
    7. The UI updates the table, changing the Status badge for that user to a red "Suspended", and the action button toggles to "Unsuspend".
*   **Alternative Flows:**
    *   *Step 3a (Admin Cancels):* Admin clicks cancel on the modal. The action is aborted.
*   **Exception Flows:** None.

#### Use Case 14: Modify Global System Settings
*   **Use Case ID:** UC-014
*   **Name:** Modify Global System Settings
*   **Actor:** Admin
*   **Description:** The administrator adjusts global, application-wide configuration flags, such as enabling emergency maintenance mode or altering overarching API throttle limits.
*   **Pre-conditions:** The Admin is authenticated and on the System Settings screen.
*   **Post-conditions:** Global application state variables are updated, affecting system behavior globally.
*   **Main Flow:**
    1. The Admin navigates to the System Settings screen from the Admin nav bar.
    2. The Admin checks the toggle box for "Enable Maintenance Mode".
    3. The Admin clicks the "Save System Configuration" button at the bottom of the form.
    4. The system updates the global configuration file or settings database table.
    5. For all subsequent HTTP requests made by non-admin users, the routing middleware detects the maintenance flag and intercepts the request.
    6. The system serves a static "Down for Maintenance. Please check back later." HTML page to general traffic instead of the application.
*   **Alternative Flows:** None.
*   **Exception Flows:** None.

#### Use Case 15: Modify Personal Profile
*   **Use Case ID:** UC-015
*   **Name:** Modify Personal Profile
*   **Actor:** General User, Advanced User, Admin
*   **Description:** A logged-in user (of any role) updates their personal account details, such as their contact email address or password.
*   **Pre-conditions:** The user is logged in.
*   **Post-conditions:** Personal account data is securely updated in the database.
*   **Main Flow:**
    1. The user clicks the "Profile" button located in the primary navigation bar.
    2. The system renders the Profile Management screen, pre-filling the current email address in the input field. The username field is disabled.
    3. The user deletes their old email address and types a new, valid email address in the input field.
    4. The user clicks the "Update Profile" button.
    5. The system validates the new email string format.
    6. The system executes an SQL UPDATE command, assigning the new email to the user's record.
    7. The system displays a success message: "Profile updated successfully."
*   **Alternative Flows:**
    *   *Change Password:* In step 3, instead of changing the email, the user fills out the "New Password" field. In step 6, the system runs the string through the hashing algorithm before updating the database record.
*   **Exception Flows:**
    *   *Step 5a (Invalid Email Format):* The user inputs a string without an '@' symbol. The system's frontend validation catches the error, prevents submission, and displays "Please enter a valid email address."

---

## Screen Mapping

The following table explicitly demonstrates the mapping between the implemented UI screens (HTML Mockups/Wireframes) and the documented Use Cases.

| Screen / HTML Page | Screen Purpose | Implements Use Case(s) |
| :--- | :--- | :--- |
| `index.html` | Core Login Portal | UC-003 |
| `select-account-type.html` | Role Selection for Sign-up | UC-001, UC-002 |
| `register-general-user.html` | General Sign-up Form | UC-001 |
| `register-advanced-user.html` | Advanced Sign-up Form | UC-002 |
| `forgot-password.html` | Password Recovery | UC-004 |
| `dashboard.html` | Primary Dashboard (General) | UC-005, UC-006, UC-007 |
| `weather-details.html` | Detailed forecast per city | UC-008 |
| `advanced-dashboard.html` | Premium tiered dashboard | UC-005, UC-009 |
| `historical-data.html` | Past weather query tool | UC-009 |
| `alerts-manager.html` | Config setting for alerts | UC-010 |
| `admin-dashboard.html` | System analytics overlay | UC-011 |
| `admin-users.html` | Table showing all users | UC-012, UC-013 |
| `settings.html` | Global Application Settings | UC-014 |
| `profile.html` | Personal account details | UC-015 |
| `locations.html` | List of purely managed locations | UC-007 |
