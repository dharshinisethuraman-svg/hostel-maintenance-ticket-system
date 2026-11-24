# Hostel Maintenance Ticket System

A modern, full-stack web application designed for residential hostels and campus housing to streamline maintenance complaint reporting, staff assignment, resolution tracking, and account management.

Built with **FastAPI** (Python 3.12+) on the backend and **React 19** with **Tailwind CSS** and **Vite** on the frontend, featuring a customized **Midnight Lavender** dual-theme (Light & Dark modes) interface.

---

## 📌 Project Overview

In residential hostels, managing student complaints (plumbing, electrical, carpentry, general repairs) through manual paper logs or informal messaging leads to lost requests, delayed resolutions, and poor accountability.

The **Hostel Maintenance Ticket System** solves this by providing:
* A structured, role-based workflow separating students, maintenance staff, and hostel administrators.
* Photo attachment capability for accurate complaint diagnostics.
* Transparent status tracking from submission to resolution.
* Comprehensive account lifecycle management for hostel administration.

---

## 🚀 Role-Based Features

### 👨‍🎓 Student Role
* **Self-Registration & Secure Login**: Students can register with their name, email, and password.
* **Complaint Submission**:
  * Fields: Title, Category (Plumbing, Electrical, Carpentry, General), Room Number, Priority (Low, Medium, High), and detailed Description.
  * Photo Attachment: Upload complaint photos (JPEG, PNG, WebP up to 5MB) with local preview before submission.
* **Personal Complaint Feed**: View only complaints submitted by the logged-in student.
* **Status Filtering**: Filter personal complaints by status (*Open*, *In Progress*, *Resolved*).
* **Discussion / Comments**: Add comments and view updates on personal tickets.
* **Student Dashboard**: Quick statistics showing total filed complaints, pending requests, and resolved issues.

### 🛠️ Maintenance Staff Role
* **Dedicated Staff Dashboard**: Metrics displaying total assigned workload, in-progress tasks, and resolved repairs.
* **Assigned Work Queue**: Staff members only see tickets explicitly assigned to them by administrators.
* **Status Progression**: Update ticket progress (*Open* → *In Progress* → *Resolved*) on assigned tickets.
* **Staff Comments**: Add diagnostic notes or update students directly on assigned tickets.
* **Permission Isolation**: Staff cannot delete tickets, reassign tickets, or modify complaint ownership.

### 🛡️ Administrator Role
* **Global Hostel Overview**: Dashboard tracking hostel-wide complaint metrics and resolution rates.
* **Centralized Ticket Management**: View, filter, and inspect all complaints submitted across the hostel.
* **Staff Assignment**: Assign or reassign open complaints to active maintenance staff members (automatically transitions tickets from *Open* to *In Progress*).
* **Status Control**: Update the status of any ticket across the hostel.
* **API-Level Ticket Deletion**: Administrators can permanently delete tickets through the backend REST API (`DELETE /tickets/{id}`). This feature is currently not exposed in the React interface.
* **Account Management**:
  * Provision new staff and administrator accounts.
  * View directory of all users (students, staff, administrators) with active/inactive status indicators.
  * Search accounts by name or email, and filter by role or status.
  * Deactivate and reactivate accounts safely:
    * Deactivating a staff member automatically unassigns their active tickets and resets them to *Open* while preserving ticket history and comments.
    * Safeguards prevent administrators from deactivating themselves or the last remaining active administrator.

---

## 🔐 Authentication & Security

* **Salted Password Hashing**: Passwords are never stored in plain text; salted hashes are generated and verified using `bcrypt`.
* **JWT Access Tokens**: Stateless authentication using JSON Web Tokens (JWT) signed with `HS256` and 24-hour expiration (`exp`).
* **Role-Based Access Control (RBAC)**: Backend endpoint enforcement (`require_roles`) verifies token claims on every privileged request.
* **Account Status Enforcement**: Deactivated accounts are rejected at login and on token verification with `HTTP 403 Forbidden`.
* **Data Sanitization**: Pydantic response models (`schemas.py`) strictly filter out sensitive password hashes from all API outputs.
* **Production Secret Protection**: In production mode (`ENVIRONMENT=production`), the backend requires `JWT_SECRET_KEY` and `ADMIN_SETUP_KEY` to be at least 32 characters long, immediately halting startup if missing or using default placeholders.
* **Image Upload Security**: Binary file header and MIME inspection via Pillow (PIL) to prevent executable/malicious file uploads, with unique collision-proof UUID naming.

---

## 🎨 User Interface & Design

* **Midnight Lavender Theme**: Complete dual-mode color system built with CSS variables and Tailwind semantic classes:
  * **Dark Mode**: Deep midnight background (`#171525`), slate lavender cards (`#25213A`), vibrant lavender accents (`#A78BFA`), and high-contrast text (`#F5F3FF`).
  * **Light Mode**: Clean soft lavender background (`#F7F5FF`), crisp white cards (`#FFFFFF`), royal purple accents (`#6D4BC3`), and deep ink text (`#292344`).
* **Instant Theme Toggle**: Sun/Moon toggle in the navigation bar with automatic persistence in `localStorage`.
* **Fully Responsive**: Optimized for desktop, tablet, and mobile browsers.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide React (Icons), Axios, React Router 7 |
| **Backend** | FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2 |
| **Security & Auth** | PyJWT, Bcrypt, Python-Multipart |
| **Image Processing** | Pillow (PIL), Cloudinary SDK |
| **Database** | SQLite (Local Development) / PostgreSQL (Production via `psycopg2-binary`) |
| **Environment** | Python-Dotenv |

---

## 📁 Project Directory Structure

```text
hostel-ticket-system/
├── client/                          # React + Vite Frontend Application
│   ├── public/                      # Static assets & icons (favicon.svg, icons.svg)
│   ├── src/
│   │   ├── assets/                  # Images and illustrations
│   │   ├── components/              # Reusable UI components
│   │   │   ├── AccountManagement.jsx# Admin account directory & user status controls
│   │   │   ├── Navbar.jsx           # Global navigation with role links & theme toggle
│   │   │   ├── ProtectedRoute.jsx   # Client-side route authentication & role guard
│   │   │   └── TicketCard.jsx       # Maintenance ticket card, image modal & comments
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Global authentication state & session handler
│   │   │   └── ThemeContext.jsx     # Midnight Lavender light/dark theme provider
│   │   ├── pages/                   # Role dashboards & auth screens
│   │   │   ├── AdminHome.jsx        # Admin dashboard, ticket manager & accounts
│   │   │   ├── Login.jsx            # Sign-in page
│   │   │   ├── Register.jsx         # Student registration page
│   │   │   ├── StaffHome.jsx        # Staff assigned work queue & status updater
│   │   │   └── StudentHome.jsx      # Student ticket submission & complaint feed
│   │   ├── services/
│   │   │   └── api.js               # Centralized Axios client with JWT interceptor
│   │   ├── App.jsx                  # Main application router & role routes
│   │   ├── index.css                # Global CSS variables for Light & Dark palettes
│   │   └── main.jsx                 # React root mount
│   ├── .env.example                 # Frontend environment configuration template
│   ├── .gitignore                   # Frontend Git ignore rules
│   ├── package.json                 # Node dependencies and scripts
│   ├── tailwind.config.js           # Semantic Midnight Lavender color mapping
│   └── vite.config.js               # Vite build and dev server configuration
├── services/
│   ├── __init__.py
│   └── cloudinary_service.py        # Validated image upload service (Cloudinary / local)
├── .env.example                     # Backend environment configuration template
├── .gitignore                       # Root Git ignore rules (secrets, DBs, caches)
├── database.py                      # SQLAlchemy engine with SQLite/PostgreSQL switching
├── main.py                          # FastAPI API application, routes & static mounting
├── models.py                        # Database models (User, Ticket, Comment)
├── requirements.txt                 # Backend Python dependencies
├── schemas.py                       # Pydantic request & response models
└── security.py                      # Password hashing, JWT logic & production validation
```

---

## ⚙️ Environment Configuration

### 1. Backend Environment Setup
Create a `.env` file in the project root by copying the template:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```env
# Mode: "development" or "production"
ENVIRONMENT=development

# Database Connection:
# Development fallback: sqlite:///./test.db
# Production PostgreSQL: postgresql://username:password@hostname:5432/database_name
DATABASE_URL=sqlite:///./test.db

# JWT Secret Key (minimum 32 characters in production)
JWT_SECRET_KEY=your_secure_random_jwt_secret_key_here_32_chars_min

# Admin Setup Key (minimum 32 characters in production)
ADMIN_SETUP_KEY=your_secure_admin_setup_key_here_32_chars_min

# Cloudinary Credentials (Optional for local dev, required for production)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Frontend Environment Setup
Create a `client/.env` file from the template:
```bash
cp client/.env.example client/.env
```

Configure the API base URL in `client/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 🚀 Local Setup & Installation

### Prerequisites
* **Python**: 3.10 or higher
* **Node.js**: 18.0 or higher
* **npm**: 9.0 or higher

---

### Step 1: Backend Setup

1. **Navigate to the project root**:
   ```bash
   cd hostel-ticket-system
   ```

2. **Create and activate a virtual environment**:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the FastAPI server**:
   ```bash
   uvicorn main:app --reload
   ```
   * Backend will be running at: `http://127.0.0.1:8000`
   * Interactive API documentation (Swagger UI): `http://127.0.0.1:8000/docs`

---

### Step 2: Frontend Setup

1. **Open a new terminal and navigate to `client/`**:
   ```bash
   cd hostel-ticket-system/client
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   * Frontend will be accessible at: `http://localhost:5173`

---

### Step 3: Initial Account Setup

1. **Student Registration**:
   Students can register directly through the frontend interface by navigating to `http://localhost:5173/register`.

2. **First Administrator Account Initialization**:
   Because the privileged account creation endpoint (`/auth/admin/create-user`) requires an existing administrator's authorization, the very first administrator must be created through a controlled local database initialization process.

   Run the following Windows-compatible command in your project root. It securely prompts for the administrator's name, email, and password using `getpass` (hidden input without terminal echo), validates that no field is empty, verifies that the email is not already registered, hashes the password via `security.hash_password()`, assigns the `admin` role, and ensures the database session closes safely:

   ```bash
   python -c "
   import getpass
   from database import SessionLocal
   import models, security

   name = input('Admin Name: ').strip()
   email = input('Admin Email: ').strip().lower()
   pwd = getpass.getpass('Admin Password: ')

   if not name or not email or not pwd.strip():
       print('Error: Name, email, and password cannot be empty.')
   else:
       db = SessionLocal()
       try:
           if db.query(models.User).filter(models.User.email == email).first():
               print('Error: An account with this email already exists.')
           else:
               db.add(models.User(name=name, email=email, password=security.hash_password(pwd), role=security.ROLE_ADMIN))
               db.commit()
               print(f'Administrator account for {name} ({email}) created successfully.')
       finally:
           db.close()
   "
   ```

3. **Subsequent Staff & Administrator Provisioning**:
   Once the initial administrator is created, log in at `http://localhost:5173/login`. You can then provision maintenance staff and additional administrators directly through the **Account Management** tab in the web interface.

---

## ⚠️ Current Limitations & Future Improvements

While the application provides a robust foundation for hostel maintenance management, the following enhancements are planned:

* **Real-time Push Notifications**: Currently, status updates and new comments reflect upon page refresh or filter interaction. Future versions plan to incorporate WebSockets or Server-Sent Events (SSE) for live alerts.
* **Automated Email / SMS Notifications**: Integrating notification services (e.g., SendGrid, Twilio) to alert students when ticket status transitions to *Resolved*.
* **Pagination & Infinite Scroll**: Large complaint archives currently load in full; adding cursor-based pagination will optimize performance for institutions with tens of thousands of tickets.
* **SLA Tracking**: Adding resolution countdown timers based on complaint priority (e.g., High Priority: 24h SLA).

---

## 👩‍💻 Author

**Dharshini SR**
