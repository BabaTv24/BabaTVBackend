# Backend API

A Hono-based REST API with Supabase integration and JWT authentication.

## Structure

```
backend/
├── index.js              # Main server file
├── routes/               # API route handlers
│   ├── auth.js          # Authentication (register, login, logout)
│   ├── users.js         # User management
│   ├── operators.js     # Operator CRUD operations
│   ├── payments.js      # Payment handling
│   ├── events.js        # Event management
│   └── push.js          # Push notification subscriptions
├── utils/
│   ├── supabase.js      # Supabase client configuration
│   └── jwt.js           # JWT token signing and verification
├── middleware/
│   └── authMiddleware.js # JWT authentication middleware
├── .env                  # Environment variables
└── package.json
```

## API Endpoints

### Base URL
`http://localhost:5000`

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Users (`/api/users`) 🔒
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile
- `GET /api/users` - Get all users

### Operators (`/api/operators`) 🔒
- `GET /api/operators` - List all operators
- `GET /api/operators/:id` - Get operator by ID
- `POST /api/operators` - Create new operator
- `PUT /api/operators/:id` - Update operator
- `DELETE /api/operators/:id` - Delete operator

### Payments (`/api/payments`) 🔒
- `GET /api/payments` - Get user's payments
- `POST /api/payments` - Create new payment
- `GET /api/payments/:id` - Get payment by ID

### Events (`/api/events`) 🔒
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Push Notifications (`/api/push`) 🔒
- `POST /api/push/subscribe` - Subscribe to push notifications
- `POST /api/push/unsubscribe` - Unsubscribe from push notifications
- `POST /api/push/send` - Send push notification

🔒 = Requires authentication (Bearer token)

## Environment Variables

Create a `.env` file in the backend directory:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your-jwt-secret-key
```

## Authentication

Protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Get a token by logging in through `/api/auth/login`.

## Running the Server

```bash
cd backend
npm start
```

The server will run on port 5000.
