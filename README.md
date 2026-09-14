# 🔄 BarterConnect

> **Trade what you have. Get what you need.**

BarterConnect is a modern peer-to-peer barter marketplace that allows users to exchange items of similar value without going through a traditional buying and selling process.

Users can discover listings, create their own listings, make exchange offers, manage offers, and manage trades through a simple and responsive web application.

---

## 📌 Overview

BarterConnect is designed around a simple idea:

**Instead of buying an item, trade something you already own for something you need.**

The platform provides a marketplace where users can:

* Browse available barter listings
* View detailed item information
* Create and manage listings
* Make barter offers
* Manage incoming and outgoing offers
* Manage trades
* Create an account
* Sign in using email/password
* Sign in using Google
* Recover forgotten passwords
* Reset account passwords securely
* Manage their user profile and trading information

---

## 🎯 Core Concept

The main BarterConnect workflow is:

```text
DISCOVER
   ↓
FIND AN ITEM
   ↓
MAKE AN OFFER
   ↓
AGREE ON THE EXCHANGE
   ↓
MANAGE THE TRADE
```

### Example

A user has:

> 🎮 PlayStation 4

and wants:

> 💻 Laptop

They can find a laptop listing and offer their PlayStation 4 in exchange instead of purchasing the laptop with money.

---

# ✨ Features

## 🛍️ Marketplace

The Marketplace is the main discovery area of BarterConnect.

Users can browse available listings and select an item to view its details.

### Listing cards include:

* Item image
* Category
* Listing information
* Link to the complete listing
* Responsive layout
* Hover interaction

The application is designed to maintain a **single-column layout on mobile devices** for easier browsing.

---

## 📦 Listing Management

Authenticated users can create and manage their barter listings.

### Create Listing

Users can publish an item they want to exchange.

### My Listings

Users can view their own listings and remove listings they no longer want available.

The application asks for confirmation before removing a listing.

### Manage Listing

Individual listings can be managed through:

```text
/listings/:id/manage
```

---

## 🔎 Listing Details

Users can open any listing to view its details.

Route:

```text
/listings/:id
```

From the listing details page, users can proceed toward making a barter offer.

---

# 🤝 Barter Offers

The offer system is one of the core features of BarterConnect.

Instead of simply purchasing an item, users can propose one of their own listings as an exchange.

### Offer workflow

```text
Requested Listing
       ↓
Choose Your Listing
       ↓
Add Optional Message
       ↓
Submit Offer
       ↓
Offer Management
```

The `MakeOffer` page loads:

* The requested listing
* The user's available listings
* The selected listing
* Optional message
* Submission state
* Error state

Offers are submitted through the application API.

---

# 🔄 Trades

Once users agree to an exchange, the transaction can move into the trade workflow.

Available routes include:

```text
/trades
/trades/:id
```

The application provides:

### Trades

A central location for viewing trade activity.

### Trade Details

A dedicated page for viewing an individual trade.

The backend data model also supports two-party trade relationships through:

```text
TraderA
TraderB
```

and trade confirmation records.

---

# 👤 Authentication

BarterConnect supports multiple authentication methods.

## Email & Password

Users can:

* Register
* Log in
* Log out
* Access protected areas

Passwords are securely hashed using **bcrypt**.

The application requires passwords to contain at least:

```text
8 characters
```

Email addresses are normalized before being stored.

---

# 🔐 Google Sign-In

BarterConnect supports Google OAuth authentication using Passport.

The authentication flow is:

```text
User
 ↓
Google Sign-In
 ↓
Google Authentication
 ↓
Google Callback
 ↓
Backend generates token
 ↓
Frontend authentication callback
 ↓
Dashboard
```

Google authentication uses:

```text
/auth/google
/auth/google/callback
```

---

# 🔑 Forgot Password

BarterConnect provides a secure password recovery system.

Users can request a password reset from:

```text
/forgot-password
```

The backend:

1. Receives the user's email
2. Finds the account
3. Generates a cryptographically secure reset token
4. Hashes the token
5. Stores the hashed token
6. Gives the token an expiry time
7. Sends a reset email

The reset token expires after:

```text
1 hour
```

---

# 📧 Password Reset Email

Password-reset emails are sent using:

**Nodemailer + SMTP**

The email contains a secure reset link:

```text
/reset-password/:token
```

Users can click the button in the email to create a new password.

Only the hashed reset token is stored in the database.

This means the raw reset token does not need to be stored permanently.

---

# 🛡️ Security

BarterConnect includes several security measures.

### Password hashing

Passwords are hashed using:

```text
bcrypt
```

with a hashing cost of:

```text
12
```

### Reset tokens

Reset tokens are generated using Node.js `crypto`.

The raw token is never stored in the database.

Instead:

```text
Random Token
     ↓
SHA-256 Hash
     ↓
Database
```

### Token expiration

Password reset tokens expire after one hour.

### Token cleanup

After a successful password reset, reset tokens are removed to prevent reuse.

### Email enumeration protection

The forgot-password endpoint returns a generic response whether or not an account exists.

This prevents attackers from using the endpoint to discover registered email addresses.

---

# 👥 User System

The BarterConnect user model supports:

* Name
* Email
* Phone
* Password
* Avatar
* Google ID
* Authentication provider
* Bio
* Location
* Role
* Account status
* Barter score
* Completed trades
* Account creation date
* Account update date

---

# ⭐ Barter Score

The user model contains:

```text
barterScore
```

which can be used to represent a user's trading reputation or performance.

Users also have:

```text
completedTrades
```

which tracks completed trades.

---

# 🧩 User Relationships

The database model supports relationships for:

```text
Listings
Offers
Trades
Ratings
Verifications
Disputes
Messages
Notifications
Payments
Promotions
Subscriptions
Matches
Trade Confirmations
```

This provides a foundation for expanding BarterConnect into a more complete peer-to-peer trading ecosystem.

---

# 📱 Responsive Design

BarterConnect is designed to work across:

* Desktop
* Laptop
* Tablet
* Mobile

### Mobile design principles

The application prioritizes:

* One-column listing layouts
* Clear touch targets
* Compact spacing
* Responsive forms
* Mobile navigation
* Reduced visual clutter

The navigation is designed so that the **logo remains visible on mobile**, while other navigation links can be placed inside a mobile hamburger menu.

---

# 🧭 Application Routes

## Public Routes

| Route                    | Description                    |
| ------------------------ | ------------------------------ |
| `/`                      | Redirects to Marketplace       |
| `/marketplace`           | Marketplace                    |
| `/listings/:id`          | Listing details                |
| `/login`                 | User login                     |
| `/register`              | Account registration           |
| `/auth/callback`         | Google authentication callback |
| `/forgot-password`       | Password recovery              |
| `/reset-password/:token` | Password reset                 |

## Protected Routes

| Route                  | Description       |
| ---------------------- | ----------------- |
| `/dashboard`           | User dashboard    |
| `/listings/create`     | Create listing    |
| `/my-listings`         | User's listings   |
| `/listings/:id/manage` | Manage listing    |
| `/make-offer/:id`      | Make barter offer |
| `/offers`              | Offers            |
| `/trades`              | Trades            |
| `/trades/:id`          | Trade details     |

Protected routes require authentication through:

```text
ProtectedRoute
```

---

# 🏗️ Technology Stack

## Frontend

BarterConnect uses:

* React
* React Router
* Tailwind CSS-style utility classes
* React Context for authentication
* Axios for API communication

### Frontend structure

A typical structure includes:

```text
src/
├── api/
│   ├── axios.js
│   ├── listingApi.js
│   └── offerApi.js
│
├── components/
│   ├── Navbar.jsx
│   └── ProtectedRoute.jsx
│
├── context/
│   └── AuthContext.jsx
│
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── ForgotPassword.jsx
│   ├── ResetPassword.jsx
│   ├── Dashboard.jsx
│   ├── Marketplace.jsx
│   ├── CreateListing.jsx
│   ├── ListingDetails.jsx
│   ├── MyListings.jsx
│   ├── ManageListing.jsx
│   ├── MakeOffer.jsx
│   ├── Offers.jsx
│   ├── Trades.jsx
│   └── TradeDetails.jsx
│
└── App.jsx
```

---

# ⚙️ Backend

The backend uses:

* Node.js
* Express
* Prisma
* PostgreSQL/database supported by Prisma
* Passport
* Google OAuth
* bcrypt
* Nodemailer
* JSON Web Tokens
* Node.js crypto

A typical backend structure includes:

```text
server/
└── src/
    ├── config/
    │   ├── prisma.js
    │   └── passport.js
    │
    ├── controllers/
    │   └── authController.js
    │
    ├── middleware/
    │   └── authMiddleware.js
    │
    ├── routes/
    │   └── authRoutes.js
    │
    ├── utils/
    │   ├── auth.js
    │   └── sendEmail.js
    │
    └── ...
```

---

# 🗄️ Database

BarterConnect uses Prisma as the database ORM.

The central user model contains relationships to the major platform entities.

Conceptually:

```text
                    ┌──────────────┐
                    │     User     │
                    └──────┬───────┘
                           │
       ┌───────────┬───────┼────────┬───────────┐
       ↓           ↓       ↓        ↓           ↓
   Listings     Offers   Trades   Ratings   Messages
       │           │       │        │           │
       └───────────┴───────┴────────┴───────────┘
                           │
                    Trade Confirmations
```

---

# 🔌 API Examples

## Authentication

### Register

```http
POST /api/auth/register
```

Example request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+254700000000"
}
```

---

### Login

```http
POST /api/auth/login
```

Example:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

---

### Current User

```http
GET /api/auth/me
```

Requires authentication.

---

### Forgot Password

```http
POST /api/auth/forgot-password
```

Example:

```json
{
  "email": "john@example.com"
}
```

---

### Reset Password

```http
POST /api/auth/reset-password/:token
```

Example:

```json
{
  "password": "newPassword123"
}
```

---

# 📧 SMTP Configuration

Create an environment file for the backend.

Example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-google-app-password
EMAIL_FROM="BarterConnect <your-email@gmail.com>"
```

For Gmail, `SMTP_PASSWORD` should normally be a **Google App Password**, not the normal Gmail account password.

---

# 🌐 Environment Variables

Example frontend configuration:

```env
VITE_API_URL=http://localhost:5000/api
```

Example backend configuration:

```env
PORT=5000

DATABASE_URL=your_database_url

JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-google-app-password
EMAIL_FROM="BarterConnect <your-email@gmail.com>"
```

Do **not** commit your `.env` file to GitHub.

Add it to:

```text
.gitignore
```

Example:

```gitignore
.env
.env.local
node_modules/
dist/
build/
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/barterConnect.git
```

Then:

```bash
cd barterConnect
```

---

# 📦 Install Frontend Dependencies

From the frontend directory:

```bash
npm install
```

---

# 📦 Install Backend Dependencies

From the server directory:

```bash
cd server
npm install
```

---

# 🗄️ Configure Database

Configure your Prisma database connection:

```env
DATABASE_URL="your_database_connection_string"
```

Then run Prisma migrations:

```bash
npx prisma migrate dev
```

Generate Prisma Client:

```bash
npx prisma generate
```

---

# ▶️ Run the Application

Start the backend:

```bash
npm run dev
```

Start the frontend:

```bash
npm run dev
```

The frontend will normally run on:

```text
http://localhost:5173
```

The backend will normally run on:

```text
http://localhost:5000
```

---

# 🔐 Google OAuth Configuration

Google Sign-In requires OAuth credentials.

Configure the appropriate Google OAuth credentials in your backend environment.

The callback URL must match the callback configured in Google Cloud.

Development callback:

```text
http://localhost:5000/api/auth/google/callback
```

The frontend authentication callback is:

```text
http://localhost:5173/auth/callback
```

---

# 🔄 Authentication Architecture

The authentication architecture can be summarized as:

```text
                    ┌───────────────┐
                    │     User      │
                    └───────┬───────┘
                            │
                  ┌─────────┴─────────┐
                  ↓                   ↓
          Email / Password        Google OAuth
                  │                   │
                  ↓                   ↓
              Express             Passport
                  │                   │
                  └─────────┬─────────┘
                            ↓
                     Generate Token
                            ↓
                       Frontend
                            ↓
                      AuthContext
                            ↓
                    Protected Routes
```

---

# 🔄 Password Recovery Architecture

```text
User
 │
 ↓
Forgot Password
 │
 ↓
POST /auth/forgot-password
 │
 ↓
Generate Secure Token
 │
 ↓
Hash Token
 │
 ↓
Store Hash + Expiry
 │
 ↓
Send Email
 │
 ↓
User Clicks Reset Link
 │
 ↓
/reset-password/:token
 │
 ↓
Submit New Password
 │
 ↓
Hash Password
 │
 ↓
Update User
 │
 ↓
Delete Reset Token
 │
 ↓
Login
```

---

# 🎨 Brand Identity

BarterConnect uses a maroon-centered visual identity.

Primary colors include:

| Color          | Hex       |
| -------------- | --------- |
| Primary Maroon | `#5B1725` |
| Dark Maroon    | `#3D0F18` |
| Rose           | `#DCAEB7` |
| Text           | `#21191B` |
| Background     | `#F8F5F3` |
| Border         | `#E7DDDF` |

The visual style focuses on:

* Trust
* Simplicity
* Community
* Exchange
* Modern marketplace design

---

# 📊 Product Architecture

```text
                    BarterConnect
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ↓                 ↓                 ↓
 Authentication       Marketplace        Trading
        │                 │                 │
        │                 ├── Listings      ├── Offers
        │                 ├── Details       ├── Trades
        │                 └── Discovery     └── Confirmations
        │
        ├── Login
        ├── Registration
        ├── Google OAuth
        └── Password Recovery
```

---

# 🧪 Testing Checklist

Before deploying BarterConnect, test the following:

### Authentication

* [ ] Register a new user
* [ ] Attempt duplicate registration
* [ ] Login with correct credentials
* [ ] Login with incorrect credentials
* [ ] Logout
* [ ] Google Sign-In
* [ ] Protected route access

### Password Recovery

* [ ] Request password reset
* [ ] Receive reset email
* [ ] Click reset button
* [ ] Open reset page
* [ ] Create new password
* [ ] Login using new password
* [ ] Verify expired tokens fail
* [ ] Verify used tokens cannot be reused

### Listings

* [ ] Create listing
* [ ] View listing
* [ ] View listing details
* [ ] View My Listings
* [ ] Manage listing
* [ ] Remove listing

### Offers

* [ ] Open listing
* [ ] Create offer
* [ ] Select user's listing
* [ ] Add offer message
* [ ] Submit offer
* [ ] View offers

### Trades

* [ ] View trades
* [ ] Open trade details
* [ ] Verify trade status changes
* [ ] Verify trade confirmation behavior

### Responsive Design

* [ ] Desktop
* [ ] Laptop
* [ ] Tablet
* [ ] Mobile
* [ ] One-column mobile marketplace
* [ ] Mobile hamburger navigation

---

# 🚀 Future Improvements

Potential future development areas include:

* Advanced listing search
* Category filtering
* Location-based discovery
* Listing favorites
* Real-time messaging
* Push notifications
* User ratings and reviews
* User verification
* Trade disputes
* Advanced matching
* Trade recommendations
* Payment integration
* Subscription plans
* Promotional listings
* Trade analytics
* Admin dashboard
* Moderation tools
* Reporting system
* Image optimization
* Cloud image storage
* Production monitoring

These should be implemented according to the actual product requirements and backend architecture.

---

# 🛡️ Production Checklist

Before deploying to production:

* [ ] Replace localhost URLs
* [ ] Configure production database
* [ ] Configure production SMTP
* [ ] Configure Google OAuth production callback
* [ ] Generate a strong JWT secret
* [ ] Configure CORS
* [ ] Configure HTTPS
* [ ] Secure environment variables
* [ ] Add rate limiting
* [ ] Add request validation
* [ ] Configure logging
* [ ] Configure database backups
* [ ] Test password recovery
* [ ] Test Google authentication
* [ ] Test mobile layouts
* [ ] Test protected routes
* [ ] Review API authorization
* [ ] Review file/image upload security
* [ ] Add production error monitoring

---

# 🤝 Contributing

Contributions are welcome.

### 1. Fork the repository

```bash
git fork
```

### 2. Create a feature branch

```bash
git checkout -b feature/my-new-feature
```

### 3. Make your changes

Implement and test your changes.

### 4. Commit

```bash
git add .
git commit -m "Add new barter feature"
```

### 5. Push

```bash
git push origin feature/my-new-feature
```

### 6. Open a Pull Request

Describe:

* What changed
* Why it changed
* How it was tested
* Any additional configuration required

---

# 🐛 Reporting Issues

When reporting an issue, include:

* Description of the problem
* Steps to reproduce
* Expected behavior
* Actual behavior
* Browser/device
* Relevant console error
* Backend error, if applicable
* Screenshots where useful

Never include:

* Passwords
* API secrets
* JWT secrets
* Google OAuth secrets
* SMTP passwords
* Database credentials

---

# 📄 License

Add your preferred open-source or commercial license here.

For example:

```text
MIT License
```

---

# 👨‍💻 Project

**BarterConnect**

### Tagline

> **Trade what you have. Get what you need.**

### Core principle

> **Exchange items of similar value with people around you.**

BarterConnect aims to make peer-to-peer item exchange simple, accessible and convenient by removing the unnecessary complexity of traditional buying and selling.

---

## ⭐ BarterConnect

```text
DISCOVER
    ↓
LIST
    ↓
OFFER
    ↓
AGREE
    ↓
TRADE
    ↓
GROW
```

**Trade smarter. Exchange better. Grow together.**
