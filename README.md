# 💰 Expense Reminder App

A clean, user-friendly web application for managing expenses and receiving automated email reminders.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Login  │  │  Signup   │  │Dashboard │  │ Add Expense │ │
│  └────┬────┘  └─────┬─────┘  └────┬─────┘  └──────┬──────┘ │
└───────┼─────────────┼─────────────┼───────────────┼─────────┘
        │             │             │               │
        └─────────────┴──────┬──────┴───────────────┘
                             │ HTTP/REST API
┌────────────────────────────┴────────────────────────────────┐
│                    BACKEND (Express.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Auth Routes │  │Expense Routes│  │  Email Scheduler │  │
│  │  /api/auth/* │  │/api/expenses │  │   (node-cron)    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐ │
│  │                    Middleware                          │ │
│  │         (JWT Auth, Validation, Error Handler)          │ │
│  └────────────────────────┬──────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                      DATABASE (SQLite)                       │
│  ┌─────────────────┐        ┌────────────────────────────┐ │
│  │     Users       │        │         Expenses           │ │
│  │  - id           │◄───────│  - id                      │ │
│  │  - name         │        │  - user_id (FK)            │ │
│  │  - email        │        │  - expense_name            │ │
│  │  - password_hash│        │  - amount                  │ │
│  │  - created_at   │        │  - category                │ │
│  └─────────────────┘        │  - due_date                │ │
│                             │  - reminder_date           │ │
│                             │  - recurring               │ │
│                             │  - email_sent              │ │
│                             │  - created_at              │ │
│                             └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Reminder App/
├── backend/
│   ├── config/
│   │   └── database.js         # Database connection
│   ├── middleware/
│   │   └── auth.js             # JWT authentication
│   ├── routes/
│   │   ├── auth.js             # Login/Signup routes
│   │   └── expenses.js         # CRUD operations
│   ├── services/
│   │   └── emailService.js     # Email sending logic
│   ├── scheduler/
│   │   └── reminderScheduler.js # Cron job for reminders
│   ├── server.js               # Main entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── context/            # Auth context
│   │   ├── services/           # API calls
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### 1. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your email settings
npm run dev
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Access the App
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🔑 Environment Variables

Create a `.env` file in the backend folder:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# For Gmail, use App Password:
# 1. Enable 2FA on Google Account
# 2. Go to Security > App Passwords
# 3. Generate password for "Mail"
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | Get all user expenses |
| GET | `/api/expenses/:id` | Get single expense |
| POST | `/api/expenses` | Create new expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/expenses/summary/monthly` | Get monthly summary |

## 🔒 Security Best Practices

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Signed, expiring tokens
3. **Input Validation**: All inputs sanitized
4. **SQL Injection Prevention**: Parameterized queries
5. **CORS**: Configured for specific origins
6. **Rate Limiting**: Prevents brute force attacks
7. **Helmet**: Security headers

## 📧 Email Reminder Logic

The scheduler runs every hour and:
1. Queries expenses where `reminder_date <= today`
2. Filters out already sent reminders (`email_sent = false`)
3. Sends personalized emails to users
4. Marks expenses as `email_sent = true`

## 🎨 UI Features

- Clean, minimal design with soft colors
- Responsive layout (mobile + desktop)
- Date pickers for due/reminder dates
- Category filtering
- Monthly expense summary
- Dark mode toggle
- Toast notifications for feedback

## 📝 License

MIT License - Feel free to use and modify!
