# BabaTV24 Backend API - Dokumentacja v2.2.0

**Base URL:** `https://babatvbackend.onrender.com`

**Framework:** Hono (Node.js ESM)

---

## Spis Tresci

1. [Autentykacja](#autentykacja)
2. [Admin - Zarzadzanie Uzytkownikami](#admin---zarzadzanie-uzytkownikami)
3. [Admin - Statystyki i Dashboard](#admin---statystyki-i-dashboard)
4. [Publiczne Endpointy](#publiczne-endpointy)
5. [Kody Bledow](#kody-bledow)
6. [Struktura Danych Uzytkownika](#struktura-danych-uzytkownika)
7. [CORS i Naglowki](#cors-i-naglowki)

---

## Autentykacja

### POST /api/admin/login

Logowanie administratora z opcjonalnym 2FA.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "haslo123"
}
```

**Response (bez 2FA):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Admin authenticated (2FA disabled)."
}
```

**Response (z 2FA):**
```json
{
  "success": true,
  "requires2FA": true,
  "message": "Enter Google Authenticator code."
}
```

**Bledy:**
| Kod | Opis |
|-----|------|
| 401 | Invalid credentials |
| 429 | Too many requests / Too many failed attempts |
| 500 | Admin password not configured |

---

### POST /api/admin/verify-2fa

Weryfikacja kodu 2FA (Google Authenticator).

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Admin authenticated."
}
```

**Bledy:**
| Kod | Opis |
|-----|------|
| 400 | 2FA not configured / Replay attack detected |
| 401 | Invalid 2FA code |

---

### POST /api/admin/logout
### GET /api/admin/logout

Wylogowanie administratora.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Admin - Zarzadzanie Uzytkownikami

> Wszystkie endpointy `/api/admin/*` (oprocz login/logout) wymagaja naglowka:
> ```
> Authorization: Bearer <token>
> ```

---

### GET /api/admin/users

Pobiera liste uzytkownikow z paginacja i filtrami.

**Query Parameters:**
| Parametr | Typ | Domyslnie | Opis |
|----------|-----|-----------|------|
| page | int | 1 | Numer strony |
| limit | int | 50 | Liczba wynikow na strone |
| q | string | "" | Szukaj w email/firstName/lastName |
| status | string | "" | Filtruj po accessStatus (active/suspended/expired) |
| role | string | "" | Filtruj po roli (user/moderator/admin) |

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "ea4c6e19-1234-5678-abcd-123456789abc",
      "publicId": 370,
      "email": "jan.kowalski@example.com",
      "firstName": "Jan",
      "lastName": "Kowalski",
      "phone": "+48123456789",
      "address": "ul. Przykladowa 1",
      "city": "Warszawa",
      "country": "Polska",
      "postalCode": "00-001",
      "role": "user",
      "plan": "VIP",
      "accessStatus": "active",
      "expiresAt": "2025-12-31T23:59:59.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-10T14:20:00.000Z",
      "meta": {
        "tags": [],
        "isPremium": false
      }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50,
  "pages": 1,
  "source": "supabase"
}
```

---

### POST /api/admin/users

Tworzy nowego uzytkownika.

**Request:**
```json
{
  "email": "nowy.user@example.com",
  "firstName": "Anna",
  "lastName": "Nowak",
  "phone": "+48987654321",
  "address": "ul. Testowa 5",
  "city": "Krakow",
  "country": "Polska",
  "postalCode": "30-001",
  "role": "user",
  "plan": "VIP",
  "accessStatus": "active",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "password": "opcjonalne_haslo"
}
```

**Pola wymagane:** `email`, `firstName`, `lastName`

**Pola opcjonalne z domyslnymi wartosciami:**
| Pole | Domyslnie |
|------|-----------|
| role | "user" |
| plan | "VIP" |
| accessStatus | "active" |
| password | Auto-generowane 14-znakowe |

**Dozwolone wartosci role:**
- `user`, `moderator`, `admin`
- Aliasy: `administrator` -> `admin`, `mod` -> `moderator`

**Dozwolone wartosci accessStatus:**
- `active`, `suspended`, `expired`

**Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-nowego-uzytkownika",
    "publicId": 371,
    "email": "nowy.user@example.com",
    "firstName": "Anna",
    "lastName": "Nowak",
    "role": "user",
    "plan": "VIP",
    "accessStatus": "active",
    "createdAt": "2025-01-10T15:00:00.000Z",
    "updatedAt": "2025-01-10T15:00:00.000Z"
  },
  "generatedPassword": "Ab3kM9pQr2xYz5",
  "source": "supabase"
}
```

> **UWAGA:** Pole `generatedPassword` pojawia sie tylko gdy haslo zostalo wygenerowane automatycznie.

**Bledy:**
| Kod | Opis |
|-----|------|
| 400 | email, firstName, lastName are required / Invalid email format / Invalid role/accessStatus |
| 409 | User with this email already exists |

---

### PUT /api/admin/users/:id
### PATCH /api/admin/users/:id

Aktualizuje dane uzytkownika.

**URL Parameter:** `id` - UUID uzytkownika

**Request (wszystkie pola opcjonalne):**
```json
{
  "email": "nowy.email@example.com",
  "firstName": "Janina",
  "lastName": "Kowalska",
  "phone": "+48111222333",
  "address": "ul. Nowa 10",
  "city": "Gdansk",
  "country": "Polska",
  "postalCode": "80-001",
  "role": "moderator",
  "plan": "Premium",
  "accessStatus": "suspended"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "ea4c6e19-1234-5678-abcd-123456789abc",
    "publicId": 370,
    "email": "nowy.email@example.com",
    "firstName": "Janina",
    "lastName": "Kowalska",
    "role": "moderator",
    "plan": "Premium",
    "accessStatus": "suspended",
    "updatedAt": "2025-01-10T16:00:00.000Z"
  },
  "source": "supabase"
}
```

**Bledy:**
| Kod | Opis |
|-----|------|
| 400 | Invalid email format / Invalid role |
| 404 | User not found |
| 409 | Email already in use |

---

### PATCH /api/admin/users/:id/role

Aktualizuje tylko role uzytkownika.

**Request:**
```json
{
  "role": "admin"
}
```

**Normalizacja rol:**
| Input | Wynik |
|-------|-------|
| "USER", "user" | "user" |
| "ADMIN", "administrator" | "admin" |
| "MODERATOR", "mod" | "moderator" |

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "role": "admin"
  },
  "source": "supabase"
}
```

---

### DELETE /api/admin/users/:id

Usuwa uzytkownika.

**Response:**
```json
{
  "success": true,
  "message": "User deleted",
  "source": "supabase"
}
```

**Bledy:**
| Kod | Opis |
|-----|------|
| 404 | User not found |

---

## Admin - Statystyki i Dashboard

### GET /api/admin/stats

Pobiera podstawowe statystyki.

**Response:**
```json
{
  "success": true,
  "stats": {
    "usersTotal": 42,
    "activeUsers": 38,
    "revenue": 0
  }
}
```

---

### GET /api/admin/dashboard

Pobiera szczegolowe statystyki dashboardu.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalAds": 5,
    "activeAds": 3,
    "totalCoupons": 10,
    "activeCoupons": 7,
    "totalTestimonials": 15,
    "pendingTestimonials": 2,
    "unreadMessages": 4,
    "videoLoopActive": true,
    "premiumUsers": 12,
    "system": "BabaTV24 ADMIN PANEL - ULTRA-PRO SECURITY",
    "status": "OK"
  }
}
```

---

## Publiczne Endpointy

### GET /api/public/stats

Pobiera liczbe zarejestrowanych uzytkownikow (bez autoryzacji).

**Response:**
```json
{
  "success": true,
  "totalUsers": 42
}
```

---

### GET /

Status API.

**Response:**
```json
{
  "status": "OK",
  "message": "BabaTV24 Backend ULTRA-PRO SECURITY",
  "version": "2.2.0",
  "frontend": "https://www.babatv24.com",
  "environment": "production",
  "endpoints": {
    "auth": "/api/auth",
    "users": "/api/users",
    "admin": "/api/admin",
    "public": "/api/public"
  }
}
```

---

## Kody Bledow

| Kod HTTP | Znaczenie |
|----------|-----------|
| 200 | OK |
| 201 | Created (nowy zasob) |
| 400 | Bad Request (bledne dane wejsciowe) |
| 401 | Unauthorized (brak/bledny token) |
| 404 | Not Found (zasob nie istnieje) |
| 409 | Conflict (duplikat, np. email juz istnieje) |
| 429 | Too Many Requests (rate limiting) |
| 500 | Internal Server Error |

**Format bledu:**
```json
{
  "success": false,
  "error": "Opis bledu",
  "details": "Dodatkowe informacje (opcjonalnie)"
}
```

---

## Struktura Danych Uzytkownika

```typescript
interface User {
  id: string;              // UUID (primary key)
  publicId: number | null; // bigint (ludzkie ID dla UI)
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  bankAccount: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  tiktokUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  role: "user" | "moderator" | "admin";
  plan: string;            // np. "VIP", "Premium", "Basic"
  accessStatus: "active" | "suspended" | "expired";
  expiresAt: string | null; // ISO 8601 date
  createdAt: string;       // ISO 8601 date
  updatedAt: string;       // ISO 8601 date
}
```

---

## CORS i Naglowki

### Dozwolone Origins
- `https://www.babatv24.com`
- `https://babatv24.com`
- `http://localhost:5173`
- `http://localhost:5000`

### Dozwolone Metody
`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

### Dozwolone Naglowki
`Content-Type`, `Authorization`, `X-Requested-With`

### Credentials
`Access-Control-Allow-Credentials: true`

---

## Przyklady Uzycia (JavaScript/TypeScript)

### Login admina
```typescript
const login = async (email: string, password: string) => {
  const res = await fetch("https://babatvbackend.onrender.com/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password })
  });
  return res.json();
};
```

### Pobranie listy uzytkownikow
```typescript
const getUsers = async (token: string, page = 1, limit = 50) => {
  const res = await fetch(
    `https://babatvbackend.onrender.com/api/admin/users?page=${page}&limit=${limit}`,
    {
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      credentials: "include"
    }
  );
  return res.json();
};
```

### Tworzenie uzytkownika
```typescript
const createUser = async (token: string, userData: Partial<User>) => {
  const res = await fetch("https://babatvbackend.onrender.com/api/admin/users", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(userData)
  });
  return res.json();
};
```

### Aktualizacja uzytkownika
```typescript
const updateUser = async (token: string, userId: string, updates: Partial<User>) => {
  const res = await fetch(`https://babatvbackend.onrender.com/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(updates)
  });
  return res.json();
};
```

### Usuniecie uzytkownika
```typescript
const deleteUser = async (token: string, userId: string) => {
  const res = await fetch(`https://babatvbackend.onrender.com/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    credentials: "include"
  });
  return res.json();
};
```

---

## Wazne Uwagi

1. **ID vs publicId**: Frontend powinien wyswietlac `publicId` jako "ID" w UI (liczba), ale uzywac `id` (UUID) do operacji API.

2. **Token JWT**: Przechowuj w `localStorage` lub `sessionStorage`. Dodawaj do kazdego requestu jako `Authorization: Bearer <token>`.

3. **Normalizacja danych**: Backend normalizuje dane (camelCase), wiec frontend zawsze otrzymuje `firstName`, `lastName`, `accessStatus` itd.

4. **Generowane haslo**: Przy tworzeniu uzytkownika bez hasla, backend generuje 14-znakowe haslo i zwraca je w `generatedPassword`. Wyswietl je administratorowi jednorazowo!

5. **Rate Limiting**: Login ma limit prob. Po zbyt wielu blednych probach IP zostanie zablokowane.

---

**Wersja dokumentacji:** 2.2.0
**Data aktualizacji:** 2025-01-10
