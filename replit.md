# BabaTV24 Backend API

## Overview
Complete backend API for the BabaTV24 application built with Hono (modern web framework) and Node.js ESM modules. Compatible with Render.com FREE tier using in-memory storage.

## Project Structure
```
/
├── index.js              # Main entry point with all route registrations
├── package.json          # Dependencies and scripts
├── routes/
│   ├── auth.js          # Authentication (register, login, logout)
│   ├── users.js         # User profile management
│   ├── operators.js     # Operator management
│   ├── payments.js      # Payment processing (Stripe/PayPal placeholder)
│   ├── events.js        # Events management
│   ├── push.js          # Push notifications with deep-link support
│   ├── ads.js           # HTML Banner Ads management
│   ├── coupons.js       # Coupon/discount system
│   ├── testimonials.js  # Customer testimonials
│   ├── sms.js           # SMS notifications (Twilio/Vonage placeholder)
│   ├── chat.js          # User ↔ Admin chat
│   ├── video.js         # TV Loop Manager
│   └── admin.js         # Admin panel (premium toggle, user tagging)
├── middleware/
│   └── authMiddleware.js # JWT authentication middleware
└── utils/
    ├── supabase.js      # Supabase client
    ├── jwt.js           # JWT token utilities
    └── dataStore.js     # In-memory data storage
```

## API Endpoints

### Public Endpoints
- `GET /` - API status and available endpoints
- `GET /api/ads` - Get active ads
- `GET /api/ads/:id` - Get ad by ID (deep-link)
- `GET /api/testimonials` - Get approved testimonials
- `POST /api/testimonials/submit` - Submit new testimonial
- `POST /api/coupons/validate` - Validate a coupon code
- `GET /api/video/current` - Get current video loop
- `GET /api/video/playlist` - Get video playlist

### Protected Endpoints (require JWT)
- `/api/auth/*` - Registration, login, logout
- `/api/users/*` - User profile operations
- `/api/push/*` - Push notification management
- `/api/chat/*` - User chat messages
- `/api/coupons/apply` - Apply coupon to order
- `/api/sms/*` - SMS operations
- `/api/admin/*` - Admin operations

## Running the Project
```bash
npm install
npm start
```

Server runs on `PORT` environment variable or `5000` by default.

## Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/service key
- `JWT_SECRET` - Secret for JWT token signing
- `PORT` - Server port (default: 5000)

## Dokumentacja
- `docs/ADMIN_DOKUMENTACJA.md` - Pelna dokumentacja dla Administratora (PL)
- `docs/API_REFERENCE.md` - Szybka referencja API (PL)

## Recent Changes
- **2024-12**: Dodano pelna dokumentacje dla Admina
- **2024**: Added new route modules (ads, coupons, testimonials, sms, chat, video, admin)
- **2024**: Implemented in-memory data storage for Render FREE tier compatibility
- **2024**: Added deep-link push notification support for ads
- **2024**: Added error handling and 404 middleware

## User Preferences
- Uses Hono framework (Express-like API)
- ESM modules (import/export)
- In-memory storage (no database dependency for basic features)
- Supabase for persistent user data

## Deployment Notes
- Compatible with Render.com FREE tier
- Set `PORT` environment variable in production
- Configure Supabase credentials for user management
- Add Twilio/Vonage credentials for SMS in production
- Add Stripe/PayPal credentials for payments in production
