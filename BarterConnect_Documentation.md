# BarterConnect — Technical & Product Documentation

> **Tagline:** Trade what you have for what you need.  
> **Brand:** BarterConnect / Barter Trade  
> **Document status:** Project documentation based on the implementation details shared so far  
> **Last updated:** September 14, 2026

---

## 1. Project Overview

BarterConnect is a web application built around direct item-to-item exchange. The core idea is to allow users to discover items from people around them, make trade offers using their own listed items, and complete exchanges without a traditional buying-and-selling process.

### Core product message

- **Trade what you have for what you need.**
- Exchange items of similar value with people around you.
- Find an item, make an offer, and trade.

### Main goals

1. Make discovering tradeable items simple.
2. Allow users to publish their own listings.
3. Allow users to propose item-for-item exchanges.
4. Support offer and trade management.
5. Provide account authentication and recovery.
6. Support local-password and Google authentication.
7. Provide a responsive, user-friendly interface.

---

## 2. Technology Stack

### Frontend

- React
- React Router
- Tailwind CSS utility classes
- Axios
- React Context for authentication

### Backend

- Node.js
- Express
- Prisma
- PostgreSQL-compatible Prisma database configuration
- bcryptjs
- JSON Web Tokens (JWT)
- Passport
- Google OAuth
- Nodemailer
- Node `crypto`

### Authentication

The application supports:

- Local registration
- Local login
- JWT authentication
- Google Sign-In
- Password recovery
- Password reset
- Google-account password creation/reset flow

---

## 3. High-Level Architecture

```text
+-----------------------------+
|        React Frontend       |
| Pages / Components / Router |
+-------------+---------------+
              |
              | Axios / REST API
              v
+-----------------------------+
|       Express Backend       |
| Routes -> Controllers       |
| Middleware -> Utilities     |
+------+----------------------+
       |
       +--------------------+
       |                    |
       v                    v
+--------------+     +---------------+
|   Prisma     |     |   Nodemailer  |
|   Database   |     |   SMTP Email  |
+------+-------+     +---------------+
       |
       v
+-----------------------------+
| User / Listings / Offers    |
| Trades / Messages / Ratings |
+-----------------------------+

Google OAuth
     |
     v
Passport -> Google -> Backend -> JWT -> Frontend
```

---

## 4. Frontend Routing

The shared application routes are:

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Redirects to marketplace |
| `/marketplace` | Public | Browse marketplace listings |
| `/listings/:id` | Public | View listing details |
| `/login` | Public | User login |
| `/register` | Public | Account registration |
| `/auth/callback` | Public | Google authentication callback |
| `/forgot-password` | Public | Request password reset |
| `/reset-password/:token` | Public | Set a new password |
| `/dashboard` | Protected | User dashboard |
| `/listings/create` | Protected | Create a listing |
| `/my-listings` | Protected | Manage user's listings |
| `/listings/:id/manage` | Protected | Manage an existing listing |
| `/make-offer/:id` | Protected | Make an offer |
| `/offers` | Protected | Manage offers |
| `/trades` | Protected | View trades |
| `/trades/:id` | Protected | View trade details |

The protected routes are wrapped with `ProtectedRoute`.

---

## 5. Frontend Structure

The implementation uses a structure including:

```text
src/
├── api/
├── components/
├── context/
├── pages/
└── ...
```

Known page files include:

```text
pages/
├── Login
├── Register
├── Dashboard
├── AuthCallback
├── Marketplace
├── CreateListing
├── ListingDetails
├── MyListings
├── ManageListing
├── MakeOffer
├── Offers
├── Trades
├── TradeDetails
├── ForgotPassword
└── ResetPassword
```

Known reusable components include:

```text
components/
├── ProtectedRoute
├── Navbar
└── ...
```

The complete repository should be used to produce an exact file-by-file tree.

---

## 6. Authentication

Authentication is provided through `AuthContext`.

Typical frontend usage:

```jsx
const { user, login, logout } = useAuth();
```

Login calls:

```js
await login({
  email: form.email,
  password: form.password,
});
```

Successful login redirects to:

```text
/dashboard
```

Logout clears authentication state and redirects the user to login.

---

## 7. Registration

The registration controller expects:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password",
  "phone": "optional"
}
```

### Validation

The backend requires:

- Name
- Email
- Password

The password must be at least eight characters.

The email is normalized using:

```js
email.toLowerCase().trim()
```

Duplicate emails return HTTP `409`.

### Password security

Passwords are hashed using:

```js
bcrypt.hash(password, 12)
```

The plaintext password is not stored.

### Successful response

```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "...",
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "phone": "...",
    "avatar": "...",
    "role": "..."
  }
}
```

---

## 8. Login

The login endpoint expects:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

The backend:

1. Normalizes the email.
2. Finds the user.
3. Checks whether a local password exists.
4. Compares the password using bcrypt.
5. Verifies that the account is `ACTIVE`.
6. Generates a JWT.
7. Returns the authenticated user.

Invalid credentials return `401 Unauthorized`.

Google-only users without a local password are instructed to use Google Sign-In.

---

## 9. Google Sign-In

Google authentication uses Passport.

The route:

```text
GET /auth/google
```

starts OAuth authentication.

The backend requests:

```js
scope: ["profile", "email"]
```

After successful authentication, the callback generates a JWT and redirects to:

```text
http://localhost:5173/auth/callback?token=...
```

The frontend `AuthCallback` page completes the frontend authentication process.

A Google-only account may have:

```text
authProvider = GOOGLE
password = null
```

---

## 10. Password Recovery

Password recovery uses:

- Cryptographically random reset tokens
- SHA-256 token hashing
- Database storage
- One-hour expiration
- Nodemailer/SMTP
- React Router reset URLs

### Flow

```text
Forgot Password
      |
      v
POST /auth/forgot-password
      |
      v
Find user
      |
      v
Generate random token
      |
      v
Hash token
      |
      v
Store hash + expiration
      |
      v
Generate frontend reset URL
      |
      v
Send email
      |
      v
User clicks link
      |
      v
/reset-password/:token
      |
      v
POST /auth/reset-password/:token
      |
      v
Validate token
      |
      v
Update password
      |
      v
Delete token
```

---

## 11. Forgot Password API

Frontend helper:

```js
export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", {
    email,
  });

  return response.data;
};
```

Backend route:

```js
router.post("/forgot-password", forgotPassword);
```

The endpoint intentionally returns a generic response even when an account does not exist. This reduces email enumeration risk.

Example:

```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

---

## 12. Reset Token Generation

A reset token is generated with:

```js
const resetToken = crypto.randomBytes(32).toString("hex");
```

Only its SHA-256 hash is stored:

```js
const tokenHash = crypto
  .createHash("sha256")
  .update(resetToken)
  .digest("hex");
```

The token expires after one hour.

The raw token is placed in:

```text
/reset-password/<token>
```

The frontend URL should be based on:

```env
FRONTEND_URL=http://localhost:5173
```

for development, and the real HTTPS domain in production.

---

## 13. Password Reset Database Model

The controller expects a Prisma model that exposes a client delegate such as:

```text
prisma.passwordResetToken
```

A compatible model is:

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  expiresAt DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
}
```

The `User` model needs the corresponding relation:

```prisma
passwordResetTokens PasswordResetToken[]
```

The exact relation/property names must match the actual Prisma schema.

If the controller reports:

```text
Cannot read properties of undefined (reading 'deleteMany')
```

check the Prisma model name, migration, and generated Prisma Client.

Run:

```bash
npx prisma generate
```

and apply the appropriate development migration if the schema changed:

```bash
npx prisma migrate dev
```

---

## 14. Reset Password

Frontend API helper:

```js
export const resetPassword = async (token, password) => {
  const response = await api.post(
    `/auth/reset-password/${token}`,
    { password }
  );

  return response.data;
};
```

Backend route:

```js
router.post("/reset-password/:token", resetPassword);
```

Validation includes:

- Token exists
- Password exists
- Password is at least eight characters
- Reset record exists
- Reset token has not expired

The new password is hashed using bcrypt.

After a successful reset, the token is deleted so it cannot be reused.

---

## 15. Google-Account Password Creation

Google-only accounts may not have a local password.

Example:

```text
authProvider = GOOGLE
password = null
```

If BarterConnect allows these users to create a password, the password reset flow can store a bcrypt password.

The shared implementation updates:

```js
password: hashedPassword,
authProvider: "LOCAL"
```

This is a product decision. A future architecture may retain `GOOGLE` as the provider while allowing a local password as an additional authentication method.

---

## 16. Email System

Nodemailer is configured from environment variables:

```js
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
```

Email sending:

```js
await transporter.sendMail({
  from:
    process.env.EMAIL_FROM ||
    `"Barter Trade" <${process.env.SMTP_USER}>`,
  to,
  subject,
  html,
});
```

The email utility logs:

- Message ID
- Accepted recipients
- Rejected recipients
- SMTP errors

---

## 17. Gmail SMTP

For Gmail SMTP, use a Google App Password instead of the normal Gmail account password.

Example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourgmail@gmail.com
SMTP_PASSWORD=your-google-app-password
EMAIL_FROM="Barter Trade <yourgmail@gmail.com>"
```

After changing `.env`, restart the backend.

### Common error

```text
535-5.7.8 Username and Password not accepted
```

Possible causes:

- Wrong SMTP username
- Wrong App Password
- Normal Gmail password used instead of an App Password
- Wrong Google account
- Environment variables not loaded
- Backend not restarted

---

## 18. Password Reset Email

A reset email should contain:

1. Barter Trade branding
2. Reset instructions
3. A normal HTML anchor/button
4. A visible fallback URL
5. One-hour expiration notice
6. Security guidance

Example:

```html
<a href="RESET_URL" target="_blank">
  Create New Password
</a>
```

The visible fallback URL is useful when an email client does not render a button correctly.

---

## 19. Login UI

The Login page provides:

- Email field
- Password field
- Required-field validation
- Loading state
- API error handling
- Google Sign-In
- Forgot-password navigation
- Registration navigation
- Security note

The design uses a maroon brand palette and responsive layouts.

### Desktop

A two-panel layout can show branding beside the login form.

### Mobile

The layout collapses to a single-column login experience with reduced unnecessary vertical space.

---

## 20. Forgot Password UI

The Forgot Password page should:

1. Ask for an email.
2. Submit to `/auth/forgot-password`.
3. Display the generic success message.
4. Provide a link back to login.

Recommended message:

```text
If an account exists with this email, a password reset link has been sent.
```

---

## 21. Reset Password UI

The reset page is routed through:

```jsx
<Route
  path="/reset-password/:token"
  element={<ResetPassword />}
/>
```

The page should retrieve the token with:

```js
const { token } = useParams();
```

It should provide:

- New password
- Confirm password
- Minimum eight-character validation
- Password mismatch validation
- Loading state
- Invalid-token error
- Expired-token error
- Success message
- Login link

---

## 22. Protected Routes

Private pages are wrapped with:

```jsx
<Route element={<ProtectedRoute />}>
  ...
</Route>
```

Currently protected functionality includes:

- Dashboard
- Create listing
- Manage listings
- Make offers
- Offers
- Trades
- Trade details

---

## 23. Marketplace

The marketplace is the main public discovery experience.

Users can browse listings and open individual listings through:

```text
/listings/:id
```

Listing cards support:

- Listing image
- Category
- Navigation
- Hover interaction
- Fallback image when no listing image exists

The intended UX emphasizes compact cards and efficient use of available space.

---

## 24. Listings

Known listing functionality includes:

- Create Listing
- Listing Details
- My Listings
- Manage Listing
- Remove listing

Listing lifecycle:

```text
Create Listing
      |
      v
Marketplace
      |
      v
Listing Details
      |
      +----> Make Offer
      |
      +----> Manage Listing
```

---

## 25. Offers

The Make Offer page loads:

- The requested listing
- The current user's listings

The user can:

- Select an item to trade
- Add a message
- Submit an offer

The conceptual offer contains:

```text
Requested Listing
+
Offered Listing
+
Message
```

---

## 26. Trades

The application includes:

```text
/trades
/trades/:id
```

The database contains relationships for:

```text
Trader A
Trader B
```

It also includes trade confirmations and ratings.

The exact trade-state machine should be synchronized with the actual Prisma enums and trade controllers in the complete repository.

---

## 27. User Model

The currently shared Prisma `User` model is:

```prisma
model User {
  id              String     @id @default(uuid())
  name            String
  email           String     @unique
  password        String?
  phone           String?    @unique
  avatar          String?
  googleId        String?    @unique
  authProvider    String     @default("LOCAL")
  bio             String?
  location        String?
  role            UserRole   @default(USER)
  status          UserStatus @default(ACTIVE)
  barterScore     Float      @default(0)
  completedTrades Int        @default(0)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  listings           Listing[]
  sentOffers         Offer[]             @relation("SentOffers")
  receivedOffers     Offer[]             @relation("ReceivedOffers")
  tradesAsA          Trade[]             @relation("TraderA")
  tradesAsB          Trade[]             @relation("TraderB")
  ratingsGiven       Rating[]            @relation("RatingsGiven")
  ratingsReceived    Rating[]            @relation("RatingsReceived")
  verifications      Verification[]
  disputes           Dispute[]
  messagesSent       Message[]           @relation("MessagesSent")
  messagesReceived   Message[]           @relation("MessagesReceived")
  notifications      Notification[]
  payments           Payment[]
  promotions         Promotion[]
  subscriptions      Subscription[]
  matches            Match[]
  tradeConfirmations TradeConfirmation[]
}
```

---

## 28. User Profile

The `getMe` endpoint returns:

- ID
- Name
- Email
- Phone
- Avatar
- Bio
- Location
- Role
- Barter score
- Completed trades
- Authentication provider
- Account creation date

Example:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "phone": "...",
    "avatar": "...",
    "bio": "...",
    "location": "...",
    "role": "USER",
    "barterScore": 0,
    "completedTrades": 0,
    "authProvider": "LOCAL",
    "createdAt": "..."
  }
}
```

---

## 29. User Relationships

The User model connects users to:

```text
User
 |
 +-- Listings
 +-- Sent Offers
 +-- Received Offers
 +-- Trades as Trader A
 +-- Trades as Trader B
 +-- Ratings Given
 +-- Ratings Received
 +-- Verifications
 +-- Disputes
 +-- Messages Sent
 +-- Messages Received
 +-- Notifications
 +-- Payments
 +-- Promotions
 +-- Subscriptions
 +-- Matches
 +-- Trade Confirmations
```

These relationships indicate a platform designed to support a broader barter ecosystem.

---

## 30. API Layer

The frontend separates HTTP requests into API modules such as:

```text
api/
├── axios.js
├── authApi.js
├── listingApi.js
├── offerApi.js
└── ...
```

Example:

```js
export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", {
    email,
  });

  return response.data;
};
```

Keeping requests in API modules prevents page components from becoming tightly coupled to HTTP implementation details.

---

## 31. Authentication API

Based on the shared routes:

| Method | Endpoint | Authentication |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/reset-password/:token` | Public |
| GET | `/auth/me` | Protected |
| GET | `/auth/google` | Public |
| GET | `/auth/google/callback` | OAuth callback |

The complete API prefix depends on how the router is mounted in the Express application.

---

## 32. Security

Security measures already represented in the shared implementation include:

### Password hashing

```js
bcrypt.hash(password, 12)
```

### Password comparison

```js
bcrypt.compare(password, user.password)
```

### Email normalization

```js
email.toLowerCase().trim()
```

### Reset-token hashing

Only the SHA-256 token hash is stored.

### Token expiration

Reset tokens expire after one hour.

### One-time reset tokens

Tokens are deleted after successful password reset.

### Email enumeration protection

Forgot-password responses do not reveal whether an account exists.

---

## 33. Production Security Recommendations

Before production, consider:

- Rate limiting for login and password-reset endpoints
- Request-body schema validation
- Strong password policy
- Strict CORS configuration
- HTTPS
- Secure cookie configuration if cookies are introduced
- JWT expiration/refresh strategy
- Security headers
- Input sanitization
- Audit logging
- Brute-force protection
- Email rate limiting
- Reset-request throttling
- Production-grade transactional email
- Monitoring and alerting

These are recommendations and should not be interpreted as already implemented.

---

## 34. Environment Variables

Recommended structure:

```env
DATABASE_URL=

JWT_SECRET=

FRONTEND_URL=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

Never commit real secrets to source control.

---

## 35. Development Setup

### Backend

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

The exact start command should follow the backend `package.json`.

### Frontend

```bash
npm install
npm run dev
```

The current development authentication flow uses:

```text
http://localhost:5173
```

---

## 36. Troubleshooting

### Gmail SMTP authentication fails

Check:

```env
SMTP_USER=
SMTP_PASSWORD=
```

Use the Google App Password.

### Email is accepted but not visible

Inspect:

```text
EMAIL SENT SUCCESSFULLY
Message ID: ...
Accepted: [...]
Rejected: [...]
```

Then check:

- Spam
- Promotions
- Gmail filters
- Recipient address
- SMTP provider logs

### Prisma reset-token delegate is undefined

Check:

1. Prisma model name.
2. Prisma Client generated delegate.
3. Migration status.
4. Generated Prisma Client.

Run:

```bash
npx prisma generate
```

and apply schema changes with:

```bash
npx prisma migrate dev
```

### Reset button is not clickable

Log the generated URL:

```js
console.log("PASSWORD RESET URL:", resetUrl);
```

Verify it resembles:

```text
http://localhost:5173/reset-password/<token>
```

The email should contain:

```html
<a href="RESET_URL">
  Create New Password
</a>
```

and a visible fallback link.

---

## 37. Responsive UI Guidelines

The application should preserve functionality across desktop, tablet, and mobile.

### Mobile

- Logo remains visible in the navbar.
- Secondary navigation moves into a hamburger menu.
- Hamburger menu is mobile-only.
- Desktop and medium layouts remain unchanged.
- Marketplace listing cards use one column.
- Avoid unnecessary vertical whitespace.
- Keep touch targets easy to use.

### Desktop

Use the available horizontal space for:

- Multi-column layouts
- Brand panels
- Listing grids
- Dashboard sections
- Navigation

---

## 38. Brand Guidelines

### Brand

```text
BarterConnect
```

The project has also used:

```text
Barter Trade
```

### Brand concept

The visual identity should communicate:

- Exchange
- Trust
- Community
- Simplicity
- Connection
- Fair trading

### Color palette

```text
Deep Maroon    #3D0F18
Primary Maroon #5B1725
Rose Maroon    #8A2638
Light Rose     #DCAEB7
Background     #F8F5F3
Border         #E7DDDF
Dark Text      #21191B
```

---

## 39. UI/UX Principles

BarterConnect should prioritize:

1. Clear calls to action.
2. Minimal unnecessary scrolling.
3. Strong visual hierarchy.
4. Readable typography.
5. Consistent branding.
6. Responsive layouts.
7. Clear loading states.
8. Clear error messages.
9. Accessible form labels.
10. Mobile-friendly controls.

---

## 40. Error Handling

Frontend requests commonly read backend messages through:

```js
error.response?.data?.message
```

Use a fallback message:

```js
setError(
  error.response?.data?.message ||
  "Unable to process your request."
);
```

Backend controllers use `try/catch` and return structured responses:

```json
{
  "success": false,
  "message": "..."
}
```

---

## 41. Testing Checklist

### Registration

- [ ] Valid registration succeeds
- [ ] Missing name is rejected
- [ ] Missing email is rejected
- [ ] Missing password is rejected
- [ ] Password shorter than 8 characters is rejected
- [ ] Duplicate email is rejected
- [ ] Password is stored hashed

### Login

- [ ] Valid credentials succeed
- [ ] Wrong password fails
- [ ] Unknown email fails
- [ ] Google-only account gets correct guidance
- [ ] Inactive account is blocked

### Google

- [ ] Google login opens
- [ ] Callback succeeds
- [ ] JWT is generated
- [ ] Frontend receives token
- [ ] User reaches authenticated area

### Forgot Password

- [ ] Local account receives email
- [ ] Unknown account receives generic response
- [ ] Google-only account follows intended password-creation flow
- [ ] Reset token is hashed
- [ ] Token expires
- [ ] Previous token is invalidated
- [ ] Email contains a working link

### Reset Password

- [ ] Valid token succeeds
- [ ] Invalid token fails
- [ ] Expired token fails
- [ ] Password shorter than 8 characters fails
- [ ] Password mismatch is handled
- [ ] New password is hashed
- [ ] Token cannot be reused
- [ ] New password works at login

---

## 42. Production Deployment Checklist

### Backend

- [ ] Production database configured
- [ ] Strong JWT secret
- [ ] Production SMTP configured
- [ ] Production Google OAuth configured
- [ ] CORS configured
- [ ] HTTPS enabled
- [ ] Rate limiting enabled
- [ ] Input validation enabled
- [ ] Logging configured
- [ ] Secrets excluded from source control

### Frontend

- [ ] Production API URL configured
- [ ] Production reset URL configured
- [ ] Production Google callback configured
- [ ] Responsive layouts tested
- [ ] Mobile navigation tested
- [ ] Error states tested
- [ ] Loading states tested

### Database

- [ ] Production migrations applied
- [ ] Backups configured
- [ ] Reset-token model migrated
- [ ] Unique constraints verified

### Email

- [ ] Production sender configured
- [ ] SPF configured
- [ ] DKIM configured
- [ ] DMARC configured
- [ ] Reset email tested

---

## 43. Recommended Trade Lifecycle

The intended barter workflow can be represented as:

```text
USER CREATES LISTING
        |
        v
LISTING APPEARS IN MARKETPLACE
        |
        v
OTHER USER VIEWS LISTING
        |
        v
OTHER USER MAKES OFFER
        |
        v
OWNER REVIEWS OFFER
        |
   +----+----+
   |         |
Reject     Accept
   |         |
   v         v
Closed     TRADE
             |
             v
       TRADE CONFIRMATION
             |
             v
        COMPLETED TRADE
             |
             v
           RATING
```

The exact statuses must match the actual Prisma enums and trade controllers.

---

## 44. Future Features

The existing data model suggests potential future features.

### Messaging

The schema contains sent and received message relationships.

### Notifications

Notifications can support:

- New offers
- Accepted offers
- Rejected offers
- Trade confirmations
- Messages
- Account activity

### Ratings

Ratings can build trust after completed trades.

### Verification

Verification can improve marketplace trust.

### Disputes

Disputes can provide conflict-resolution workflows.

### Matching

The `Match` relationship can support automated item matching.

### Payments

Payments can support optional paid platform services.

### Promotions

Promotions can support promoted listings.

### Subscriptions

Subscriptions can support premium features.

---

## 45. Maintenance Guidelines

When adding a frontend feature:

1. Create/update the page.
2. Add reusable components where appropriate.
3. Add API functions to the API layer.
4. Add the route.
5. Protect the route if necessary.
6. Add loading and error states.
7. Test mobile layouts.

When adding a backend feature:

1. Add the route.
2. Add controller logic.
3. Validate input.
4. Check authorization.
5. Update Prisma schema if needed.
6. Create/apply migration.
7. Regenerate Prisma Client.
8. Test the endpoint.
9. Return consistent JSON responses.

---

## 46. Coding Standards

Prefer clear names:

```text
forgotPassword
resetPassword
getListingById
createOffer
```

Keep these responsibilities separated:

```text
routes
controllers
middleware
utilities
database configuration
```

Do not expose:

- Password hashes
- JWT secrets
- SMTP passwords
- OAuth client secrets
- Raw reset tokens in production logs

---

## 47. Current Implementation Notes

### Password recovery

The application uses cryptographically generated reset tokens and Nodemailer.

### Gmail

Gmail SMTP requires an App Password for this SMTP authentication approach.

### Google accounts

Google-only accounts can exist without a local password. If they need local password access, a password-creation flow is required.

### Prisma

The controller and Prisma schema must use the same generated delegate name for password-reset records.

### Reset email

The email should contain a standard HTML anchor plus a fallback URL.

### Frontend reset route

The current route is:

```jsx
<Route
  path="/reset-password/:token"
  element={<ResetPassword />}
/>
```

---

## 48. API Quick Reference

### Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/me
GET  /auth/google
GET  /auth/google/callback
POST /auth/forgot-password
POST /auth/reset-password/:token
```

### Frontend public routes

```text
/
 /marketplace
 /listings/:id
 /login
 /register
 /auth/callback
 /forgot-password
 /reset-password/:token
```

### Frontend protected routes

```text
/dashboard
/listings/create
/my-listings
/listings/:id/manage
/make-offer/:id
/offers
/trades
/trades/:id
```

---

## 49. Example Environment Template

```env
# Database
DATABASE_URL=

# Authentication
JWT_SECRET=

# Frontend
FRONTEND_URL=http://localhost:5173

# Email / SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

Never place real credentials in this file when committing it to source control.

---

## 50. Password Recovery Checklist

```text
[ ] User enters email
[ ] Frontend calls POST /auth/forgot-password
[ ] Backend normalizes email
[ ] Backend finds account
[ ] Reset token generated
[ ] Token hashed
[ ] Hash stored in database
[ ] Expiration stored
[ ] Reset URL generated from FRONTEND_URL
[ ] Nodemailer sends email
[ ] Email contains clickable button
[ ] Email contains fallback URL
[ ] User opens /reset-password/:token
[ ] Frontend reads token with useParams()
[ ] New password submitted
[ ] Backend hashes supplied token
[ ] Backend finds reset record
[ ] Expiration checked
[ ] New password hashed
[ ] User password updated
[ ] Reset token deleted
[ ] User returns to login
[ ] New password works
```

---

## 51. Product Vision

BarterConnect is a marketplace where value does not have to be represented only by money.

The central experience is:

```text
I have something.
        |
        v
Someone else needs it.
        |
        v
They have something I need.
        |
        v
We make an offer.
        |
        v
We agree.
        |
        v
We trade.
```

The long-term opportunity is to combine:

- Marketplace discovery
- Item matching
- Offers
- Messaging
- Trust and ratings
- Verification
- Trade confirmation
- Dispute handling
- Notifications
- Optional premium services

into one barter ecosystem.

---

## 52. Development Principle

The primary BarterConnect experience should remain simple:

> **Find it. Offer it. Trade it.**

Every new feature should improve discovery, trust, communication, or successful trade completion without making the core experience unnecessarily complicated.

---

## 53. Documentation Scope

This document is based on the BarterConnect implementation details shared during development.

Some database relationships are visible in the shared `User` model, but the complete implementations of their controllers, routes, and schemas were not provided here. Therefore, the following require verification against the complete repository before being treated as final API specifications:

- Listing schema
- Offer schema
- Trade schema
- Rating schema
- Message schema
- Notification schema
- Payment implementation
- Subscription implementation
- Promotion implementation
- Match implementation
- Verification implementation
- Dispute implementation
- Administrative functionality

This distinction prevents documentation from claiming that schema relationships necessarily mean fully implemented features.

---

**BarterConnect — Trade what you have for what you need.**
