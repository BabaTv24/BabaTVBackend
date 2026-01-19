# BabaTV24 Backend API - Dokumentacja v2.3.2

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

Wylogowanie administratora. Czyści cookies sesji i zwraca akcje dla frontendu.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "frontendAction": "clear_local_storage"
}
```

**Opis pol:**
| Pole | Opis |
|------|------|
| frontendAction | Akcja dla frontendu - usun token z localStorage |

**Cookies cleared:** admin_token, session, auth_token

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

### GET /api/admin/users/:id

Pobiera pojedynczego uzytkownika po UUID lub publicId.

**Akceptowane formaty :id:**
- UUID: `ea4c6e19-1234-5678-abcd-123456789abc`
- UUID bez kresek: `ea4c6e191234567890abcdef01234567`
- publicId: `371`
- Format USR: `USR-371`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "ea4c6e19-1234-5678-abcd-123456789abc",
    "publicId": 371,
    "email": "jan.kowalski@example.com",
    "firstName": "Jan",
    "lastName": "Kowalski",
    "role": "user",
    "plan": "VIP",
    "refCode": "BABA-ABC123",
    "refLink": "https://www.babatv24.com/?ref=BABA-ABC123",
    "accessStatus": "active",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "resolvedBy": "public_id"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "User not found",
  "details": { "param": "999" }
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
    "refCode": "AB3K9MPQR2",
    "refLink": "https://babatv24.com/?ref=AB3K9MPQR2",
    "createdAt": "2025-01-10T15:00:00.000Z",
    "updatedAt": "2025-01-10T15:00:00.000Z"
  },
  "generatedPassword": "Ab3kM9pQr2xYz5",
  "source": "supabase"
}
```

> **UWAGA:** 
> - Pole `generatedPassword` pojawia sie tylko gdy haslo zostalo wygenerowane automatycznie.
> - Pole `refCode` jest generowane automatycznie (10 znakow) jesli nie podano.

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

### POST /api/admin/users/:id/send-invite

Wysyla email z danymi logowania do uzytkownika. Generuje nowe haslo startowe i zapisuje je w bazie.

**URL Parameter:** `id` - UUID uzytkownika LUB publicId (liczba)

**Request:** Brak body (pusty POST)

**Response (email wyslany):**
```json
{
  "success": true,
  "message": "Invite sent",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jan.kowalski@example.com",
  "refCode": "BABA-1A2B3C",
  "refLink": "https://babatv24.com/?ref=BABA-1A2B3C",
  "emailSent": true
}
```

**Response (SMTP nie skonfigurowane - haslo zwracane adminowi):**
```json
{
  "success": true,
  "message": "Invite generated (email not configured)",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jan.kowalski@example.com",
  "refCode": "BABA-1A2B3C",
  "refLink": "https://babatv24.com/?ref=BABA-1A2B3C",
  "generatedPassword": "Ab3kM9pQr2xYz5",
  "emailSent": false
}
```

**Co robi ten endpoint:**
1. Pobiera dane uzytkownika po UUID lub publicId
2. Generuje nowe 14-znakowe haslo startowe
3. Hashuje haslo i zapisuje w bazie (`password_hash`)
4. Ustawia `must_change_password = true`
5. Ustawia `access_status = "active"`
6. Generuje refCode jesli brak (format: `BABA-XXXXXX`)
7. Wysyla email z:
   - Loginem (email)
   - Haslem startowym
   - Linkiem do logowania
   - Linkiem polecajacym (refLink)
   - Przypomnieniem o zmianie hasla
8. Jesli SMTP nie skonfigurowane - zwraca haslo adminowi

**Wymagane zmienne srodowiskowe:**
| Zmienna | Opis |
|---------|------|
| SMTP_HOST | Host serwera SMTP |
| SMTP_PORT | Port SMTP (domyslnie 587) |
| SMTP_USER | Login SMTP |
| SMTP_PASS | Haslo SMTP |
| FROM_EMAIL | Adres nadawcy (domyslnie noreply@babatv24.com) |
| APP_URL | URL aplikacji (domyslnie https://babatv24.com) |

**Bledy:**
| Kod | Opis |
|-----|------|
| 400 | Invalid userId |
| 404 | User not found |
| 500 | Database not configured / DB update failed |

---

### GET /api/admin/users/export

Eksportuje liste uzytkownikow do pliku CSV lub XLSX.

**Query Parameters:**
| Parametr | Typ | Domyslnie | Opis |
|----------|-----|-----------|------|
| format | string | xlsx | Format pliku: "csv" lub "xlsx" |

**Response:** Plik binarny (CSV lub XLSX)

**Eksportowane pola:**
publicId, email, firstName, lastName, plan, refCode, refLink, role, accessStatus, expiresAt, createdAt

---

### POST /api/admin/users/import

Importuje uzytkownikow z pliku CSV lub XLSX.

**Request:** multipart/form-data
| Pole | Typ | Opis |
|------|-----|------|
| file | File | Plik CSV lub XLSX |

**Response:**
```json
{
  "success": true,
  "message": "Import completed: 5 created, 3 updated",
  "created": 5,
  "updated": 3,
  "errors": ["Invalid email: (empty)"]
}
```

**Logika importu:**
1. Waliduje email
2. Jesli email istnieje - aktualizuje dane
3. Jesli email nie istnieje - tworzy nowego uzytkownika
4. Dla nowych: generuje haslo, ustawia mustChangePassword=true
5. NIE nadpisuje public_id (identity)

---

### POST /api/admin/push/send

Wysyla powiadomienia push do wybranych uzytkownikow lub broadcast.

**Request:**
```json
{
  "title": "Tytul powiadomienia",
  "body": "Tresc powiadomienia",
  "userIds": ["uuid1", "uuid2"],
  "publicIds": [123, 456],
  "plans": ["VIP", "Premium"],
  "sendToAll": false,
  "deeplink": "https://babatv24.com/promo"
}
```

**Parametry:**
| Pole | Typ | Opis |
|------|-----|------|
| title | string | Tytul (wymagany) |
| body | string | Tresc (wymagana) |
| userIds | string[] | Lista UUID uzytkownikow |
| publicIds | number[] | Lista public_id |
| plans | string[] | Filtruj po planach (np. ["VIP", "GOLD"]) |
| roles | string[] | Filtruj po rolach (np. ["admin", "moderator"]) |
| sendToAll | boolean | true = broadcast do wszystkich |
| target | object | Alternatywny format: { all, userIds, plans, roles } |
| deeplink | string | Link do otwarcia w aplikacji |

**Przyklad z target object:**
```json
{
  "title": "Nowosci VIP",
  "body": "Sprawdz nowe funkcje",
  "target": {
    "all": false,
    "plans": ["VIP", "GOLD"],
    "roles": ["admin"]
  }
}
```

**Response (broadcast):**
```json
{
  "success": true,
  "mode": "broadcast",
  "message": "Broadcast push notification queued",
  "title": "Tytul",
  "body": "Tresc",
  "deeplink": "https://babatv24.com/promo"
}
```

**Response (targeted):**
```json
{
  "success": true,
  "mode": "targeted",
  "message": "Push notification queued for 5 users",
  "targetCount": 5,
  "title": "Tytul",
  "body": "Tresc"
}
```

**Logika:**
- `sendToAll: true` → broadcast do wszystkich
- `userIds` lub `publicIds` podane → wyslij tylko do wybranych
- `plans: ["VIP", "Premium"]` → wyslij do uzytkownikow z tymi planami
- Brak targetow → broadcast

---

## Stats - Landing Page Counter

### GET /api/stats/users-count

Zwraca liczbe uzytkownikow i maksymalne public_id dla landing page.

**Response:**
```json
{
  "success": true,
  "usersCount": 42,
  "maxPublicId": 371
}
```

**Uzycie:**
- Landing page wyswietla `maxPublicId` jako "Dolczylo juz: 371 uzytkownikow"
- Endpoint publiczny, nie wymaga autoryzacji

---

## Admin - Statystyki i Dashboard

### GET /api/admin/stats

Pobiera podstawowe statystyki (z cache ~30s).

**Response:**
```json
{
  "success": true,
  "stats": {
    "usersTotal": 42,
    "activeUsers": 38,
    "maxPublicId": 371,
    "revenue": 0
  }
}
```

**Opis pol:**
| Pole | Opis |
|------|------|
| usersTotal | Calkowita liczba uzytkownikow |
| activeUsers | Aktywni uzytkownicy (accessStatus=active) |
| maxPublicId | Najwyzszy public_id (do "Dolaczyli juz") |

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

Pobiera statystyki dla landing page (bez autoryzacji). Uzywane do wyswietlania "Dolaczyli juz: X osob".

**Response:**
```json
{
  "success": true,
  "data": {
    "usersCount": 42,
    "maxPublicId": 371,
    "updatedAt": "2025-01-10T12:00:00.000Z"
  },
  "totalUsers": 42
}
```

**Opis pol:**
| Pole | Opis |
|------|------|
| usersCount | Rzeczywista liczba uzytkownikow (COUNT) |
| maxPublicId | Najwyzszy public_id (do wyswietlania "Dolaczyli juz") |
| totalUsers | Kompatybilnosc wsteczna (= usersCount) |

---

### GET /

Status API.

**Response:**
```json
{
  "status": "OK",
  "message": "BabaTV24 Backend ULTRA-PRO SECURITY",
  "version": "2.3.0",
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
  refCode: string | null;  // kod polecajacy (auto-generowany, np. BABA-1A2B3C)
  refLink: string | null;  // https://babatv24.com/?ref=<refCode>
  mustChangePassword: boolean; // true = uzytkownik musi zmienic haslo po logowaniu
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

### Wyslanie zaproszenia email
```typescript
const sendInvite = async (token: string, userId: string) => {
  const res = await fetch(`https://babatvbackend.onrender.com/api/admin/users/${userId}/send-invite`, {
    method: "POST",
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

6. **refCode i refLink**: Kazdy uzytkownik ma automatycznie generowany 10-znakowy kod polecajacy. Frontend moze wyswietlac `refLink` z przyciskiem "Kopiuj".

7. **send-invite**: Uzywaj do wysylania danych logowania do nowych uzytkownikow. Wymaga konfiguracji SMTP.

---

**Wersja dokumentacji:** 2.3.2
**Data aktualizacji:** 2025-01-19

---

## Changelog

### v2.3.2 (2025-01-19)
- **CRITICAL FIX** - Wszystkie Supabase .insert()/.update() uzywa TYLKO kolumn snake_case (bez camelCase)
- **send-invite** - usunieto mustChangePassword/accessStatus/refCode/updatedAt z zapisu do DB
- **push/send** - obsluguje warianty: userIds/user_ids/usersIds oraz target.userIds/target.usersIds
- **push/send** - zwraca poprawne targetCount dla targetowanych powiadomien
- **PATCH /users/:id** - zapis tylko snake_case: first_name, last_name, access_status, updated_at
- **import** - usunieto camelCase z payloadow insert/update
- **resolveUserByParam** - przeniesiony do utils/resolveUserByParam.js (wspolna funkcja)

### v2.3.1 (2025-01-13)
- **GET /api/admin/users/:id** - nowy endpoint do pobierania uzytkownika po UUID, publicId lub USR-xxx
- **resolveUserIdentifier** - obsluguje UUID, publicId, USR-371, auth_id, user_id fallback
- **POST /api/admin/push/send** - dodano roles filtering i target object format
- **GET /api/stats/users-count** - publiczny endpoint dla landing page
- **Export** - dodano kolumne `id` (UUID) do eksportu CSV/XLSX
- **send-invite** - 404 zwraca details z param, lepsze logowanie (bez hasel)

### v2.3.0 (2025-01-12)
- IMPROVED POST /api/admin/push/send - dodano plans i sendToAll
- IMPROVED logout - czyści 3 cookies, zwraca frontendAction
- IMPROVED GET /api/admin/stats - dodano maxPublicId + 30s cache
