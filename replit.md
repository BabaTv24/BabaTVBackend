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
- `APP_URL` - Frontend URL (default: https://babatv24.com)
- `SMTP_HOST` - SMTP server host (for email invites)
- `SMTP_PORT` - SMTP port (default: 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `FROM_EMAIL` - Email sender address

## Dokumentacja
- `docs/BACKEND_API_DOCUMENTATION.md` - Pelna dokumentacja API v2.3.0 (PL)
- `docs/ADMIN_DOKUMENTACJA.md` - Pelna dokumentacja dla Administratora (PL)
- `docs/API_REFERENCE.md` - Szybka referencja API (PL)

## Recent Changes
- **2025-01-13**: Added GET /api/admin/users/:id - pobiera uzytkownika po UUID/publicId/USR-xxx
- **2025-01-13**: IMPROVED resolveUserIdentifier - dodano auth_id, user_id fallback, format USR-xxx
- **2025-01-13**: IMPROVED push/send - dodano roles filtering i target object format
- **2025-01-13**: Added GET /api/stats/users-count - landing page counter (usersCount, maxPublicId)
- **2025-01-12**: IMPROVED POST /api/admin/push/send - dodano plans i sendToAll
- **2025-01-11**: IMPROVED logout - czyści 3 cookies (admin_token, session, auth_token), zwraca frontendAction
- **2025-01-11**: IMPROVED GET /api/admin/stats - dodano maxPublicId + 30s cache
- **2025-01-11**: IMPROVED resolveUserIdentifier - obsługuje UUID z/bez kresek (UUID_REGEX)
- **2025-01-10**: Added GET /api/admin/users/export - eksport CSV/XLSX
- **2025-01-10**: Added POST /api/admin/users/import - import CSV/XLSX
- **2025-01-10**: Added POST /api/admin/push/send - push admin z userIds/publicIds
- **2025-01-10**: IMPROVED GET /api/public/stats - zwraca usersCount i maxPublicId
- **2025-01-10**: IMPROVED send-invite - obsługa UUID i publicId, fallback hasła gdy brak SMTP
- **2025-01-10**: Added mustChangePassword field - wymusza zmiane hasla po pierwszym logowaniu
- **2025-01-10**: Added POST /api/admin/users/:id/send-invite - wysylka email z danymi logowania
- **2025-01-10**: Added refCode/refLink - automatyczne generowanie kodow polecajacych
- **2025-01-10**: Added plan field support with "VIP" default
- **2025-01**: Full CRUD /api/admin/users - paginacja, walidacja, fallback in-memory
- **2025-01**: ULTRA-PRO SECURITY - rate limiting, brute force protection, 2FA, security headers
- **2024-12**: Dodano pelna dokumentacje dla Admina
- **2024**: Added new route modules (ads, coupons, testimonials, sms, chat, video, admin)
- **2024**: Implemented in-memory data storage for Render FREE tier compatibility
- **2024**: Added deep-link push notification support for ads
- **2024**: Added error handling and 404 middleware

## Status Projektu (2025-01-10)

### Ukonczone (100%)
- Full CRUD uzytkownikow (GET/POST/PUT/DELETE)
- Paginacja, filtry, wyszukiwanie
- Auto-generowanie refCode i refLink
- Endpoint send-invite z SMTP fallback
- mustChangePassword flag
- Dual-write camelCase/snake_case
- ULTRA-PRO Security (2FA, rate limiting, brute force protection)
- Dokumentacja API v2.3.0

### Wymagane do produkcji
- Skonfiguruj zmienne SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS, FROM_EMAIL)
- Skonfiguruj Supabase (SUPABASE_URL, SUPABASE_KEY)
- Ustaw JWT_SECRET

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
