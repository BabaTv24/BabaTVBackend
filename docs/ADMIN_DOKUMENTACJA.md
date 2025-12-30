# BabaTV24 Backend - Dokumentacja Administratora

## Status Projektu

**Wersja:** 1.0.0  
**Status:** Gotowy do wdrożenia  
**Framework:** Hono (Node.js ESM)  
**Port:** 5000  

---

## Struktura Projektu

```
babatv-backend/
├── index.js                 # Punkt wejscia aplikacji
├── package.json             # Zaleznosci i skrypty
├── routes/
│   ├── admin.js            # Panel Admina
│   ├── ads.js              # Reklamy HTML Banner
│   ├── auth.js             # Autoryzacja (login/rejestracja)
│   ├── chat.js             # Czat uzytkownik <-> admin
│   ├── coupons.js          # System kuponow rabatowych
│   ├── events.js           # Zarzadzanie wydarzeniami
│   ├── operators.js        # Zarzadzanie operatorami
│   ├── payments.js         # Platnosci (Stripe/PayPal)
│   ├── push.js             # Powiadomienia push z deep-link
│   ├── sms.js              # Powiadomienia SMS
│   ├── testimonials.js     # Opinie klientow
│   ├── users.js            # Zarzadzanie uzytkownikami
│   └── video.js            # TV Loop Manager
├── middleware/
│   └── authMiddleware.js   # Middleware JWT
└── utils/
    ├── dataStore.js        # Magazyn danych in-memory
    ├── jwt.js              # Narzedzia JWT
    └── supabase.js         # Klient Supabase
```

---

## Endpointy API - Pelna Lista

### 1. Panel Admina (`/api/admin`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/admin/dashboard` | Statystyki panelu admina |
| GET | `/api/admin/users` | Lista wszystkich uzytkownikow |
| POST | `/api/admin/users/:userId/toggle-premium` | Przelacz status premium |
| POST | `/api/admin/users/:userId/set-premium` | Ustaw status premium z data wygasniecia |
| POST | `/api/admin/users/:userId/tags` | Dodaj tag do uzytkownika |
| DELETE | `/api/admin/users/:userId/tags/:tag` | Usun tag |
| GET | `/api/admin/users/by-tag/:tag` | Uzytkownicy wg tagu |
| GET | `/api/admin/users/premium` | Lista uzytkownikow premium |
| GET | `/api/admin/tags` | Lista wszystkich tagow |
| POST | `/api/admin/users/bulk/add-tag` | Masowe dodawanie tagow |
| POST | `/api/admin/users/bulk/set-premium` | Masowe ustawianie premium |
| GET | `/api/admin/activity` | Log aktywnosci |

**Przyklad odpowiedzi dashboard:**
```json
{
  "success": true,
  "stats": {
    "totalAds": 5,
    "activeAds": 3,
    "totalCoupons": 10,
    "activeCoupons": 8,
    "totalTestimonials": 15,
    "pendingTestimonials": 2,
    "unreadMessages": 5,
    "videoLoopActive": true,
    "premiumUsers": 25
  }
}
```

---

### 2. Reklamy - Ads (`/api/ads`)

| Metoda | Endpoint | Opis | Autoryzacja |
|--------|----------|------|-------------|
| GET | `/api/ads` | Pobierz aktywne reklamy | Publiczny |
| GET | `/api/ads/:id` | Pobierz reklame po ID (deep-link) | Publiczny |
| POST | `/api/ads/admin/create` | Utworz nowa reklame | JWT |
| PUT | `/api/ads/admin/:id` | Aktualizuj reklame | JWT |
| DELETE | `/api/ads/admin/:id` | Usun reklame | JWT |
| GET | `/api/ads/admin/all` | Wszystkie reklamy ze statystykami | JWT |

**Tworzenie reklamy:**
```json
POST /api/ads/admin/create
{
  "title": "Promocja Swieta",
  "htmlContent": "<div>Kup teraz!</div>",
  "targetUrl": "https://example.com/promo",
  "type": "banner"
}
```

**Typy reklam:** `banner`, `popup`, `push`

---

### 3. Kupony (`/api/coupons`)

| Metoda | Endpoint | Opis | Autoryzacja |
|--------|----------|------|-------------|
| POST | `/api/coupons/validate` | Sprawdz poprawnosc kuponu | Publiczny |
| POST | `/api/coupons/apply` | Zastosuj kupon do zamowienia | JWT |
| POST | `/api/coupons/admin/create` | Utworz kupon | JWT |
| GET | `/api/coupons/admin/all` | Lista wszystkich kuponow | JWT |
| PUT | `/api/coupons/admin/:id` | Aktualizuj kupon | JWT |
| DELETE | `/api/coupons/admin/:id` | Usun kupon | JWT |

**Tworzenie kuponu:**
```json
POST /api/coupons/admin/create
{
  "code": "LATO2024",
  "discountType": "percentage",
  "discountValue": 20,
  "description": "20% rabatu na lato",
  "expiresAt": "2024-09-01T00:00:00Z",
  "maxUses": 100
}
```

**Typy rabatow:** `percentage` (procentowy), `fixed` (stala kwota)

---

### 4. Opinie - Testimonials (`/api/testimonials`)

| Metoda | Endpoint | Opis | Autoryzacja |
|--------|----------|------|-------------|
| GET | `/api/testimonials` | Zatwierdzone opinie | Publiczny |
| POST | `/api/testimonials/submit` | Wyslij nowa opinie | Publiczny |
| GET | `/api/testimonials/admin/all` | Wszystkie opinie | JWT |
| GET | `/api/testimonials/admin/pending` | Oczekujace na zatwierdzenie | JWT |
| POST | `/api/testimonials/admin/approve/:id` | Zatwierdz opinie | JWT |
| DELETE | `/api/testimonials/admin/:id` | Usun opinie | JWT |
| POST | `/api/testimonials/admin/create` | Utworz opinie (admin) | JWT |

**Wysylanie opinii:**
```json
POST /api/testimonials/submit
{
  "name": "Jan Kowalski",
  "email": "jan@example.com",
  "rating": 5,
  "message": "Swietna usluga!"
}
```

---

### 5. SMS (`/api/sms`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/sms/send` | Wyslij SMS |
| POST | `/api/sms/send-bulk` | Wyslij SMS do wielu odbiorcow |
| GET | `/api/sms/history` | Historia wysylki |
| GET | `/api/sms/status/:id` | Status pojedynczego SMS |
| GET | `/api/sms/templates` | Szablony SMS |

**Wysylanie SMS:**
```json
POST /api/sms/send
{
  "to": "+48123456789",
  "message": "Twoj kod aktywacyjny: 123456"
}
```

> **Uwaga:** Wymaga konfiguracji Twilio lub Vonage w produkcji.

---

### 6. Czat (`/api/chat`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/chat/messages` | Wiadomosci uzytkownika |
| GET | `/api/chat/conversation/:recipientId` | Rozmowa z uzytkownikiem |
| POST | `/api/chat/send` | Wyslij wiadomosc |
| POST | `/api/chat/contact-admin` | Kontakt z adminem |
| GET | `/api/chat/unread` | Liczba nieprzeczytanych |
| GET | `/api/chat/admin/support` | Wiadomosci wsparcia (admin) |
| POST | `/api/chat/admin/reply` | Odpowiedz admina |
| DELETE | `/api/chat/message/:id` | Usun wiadomosc |

**Kontakt z adminem:**
```json
POST /api/chat/contact-admin
{
  "subject": "Problem z kontem",
  "message": "Nie moge sie zalogowac..."
}
```

---

### 7. Video - TV Loop Manager (`/api/video`)

| Metoda | Endpoint | Opis | Autoryzacja |
|--------|----------|------|-------------|
| GET | `/api/video/current` | Aktualny stream TV | Publiczny |
| GET | `/api/video/playlist` | Playlista video | Publiczny |
| POST | `/api/video/admin/set-loop` | Ustaw URL streamu | JWT |
| POST | `/api/video/admin/toggle` | Wlacz/wylacz stream | JWT |
| POST | `/api/video/admin/playlist/add` | Dodaj video do playlisty | JWT |
| PUT | `/api/video/admin/playlist/:id` | Aktualizuj video | JWT |
| DELETE | `/api/video/admin/playlist/:id` | Usun video | JWT |
| POST | `/api/video/admin/playlist/reorder` | Zmien kolejnosc | JWT |
| GET | `/api/video/admin/playlist/all` | Pelna playlista (admin) | JWT |

**Ustawianie streamu:**
```json
POST /api/video/admin/set-loop
{
  "url": "https://stream.babatv24.com/live.m3u8",
  "title": "BabaTV24 Na Zywo",
  "isActive": true
}
```

---

### 8. Push Notifications (`/api/push`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/push/subscribe` | Subskrybuj powiadomienia |
| POST | `/api/push/unsubscribe` | Wypisz sie |
| POST | `/api/push/send` | Wyslij powiadomienie |
| POST | `/api/push/send-ad` | Wyslij powiadomienie o reklamie |
| POST | `/api/push/send-broadcast` | Wyslij do wszystkich |
| POST | `/api/push/send-with-deeplink` | Wyslij z deep-linkiem |
| GET | `/api/push/queue` | Kolejka powiadomien |

**Push z deep-linkiem:**
```json
POST /api/push/send-with-deeplink
{
  "title": "Nowa promocja!",
  "body": "Sprawdz nasza najnowsza oferte",
  "targetType": "ad",
  "targetId": "abc123xyz"
}
```

---

### 9. Autoryzacja (`/api/auth`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/register` | Rejestracja |
| POST | `/api/auth/login` | Logowanie |
| POST | `/api/auth/logout` | Wylogowanie |

**Rejestracja:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Jan Kowalski"
}
```

**Logowanie:**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Odpowiedz logowania:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

---

### 10. Uzytkownicy (`/api/users`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/users/profile` | Profil uzytkownika |
| PUT | `/api/users/profile` | Aktualizuj profil |
| GET | `/api/users/` | Lista wszystkich (admin) |

---

### 11. Platnosci (`/api/payments`)

> Placeholder dla integracji Stripe/PayPal

---

### 12. Operatorzy (`/api/operators`)

> Zarzadzanie operatorami systemu

---

### 13. Wydarzenia (`/api/events`)

> Zarzadzanie wydarzeniami

---

## Autoryzacja JWT

Wszystkie chronione endpointy wymagaja naglowka:

```
Authorization: Bearer <token>
```

Token otrzymujesz po zalogowaniu przez `/api/auth/login`.

---

## Zmienne Srodowiskowe

| Zmienna | Opis | Wymagana |
|---------|------|----------|
| `PORT` | Port serwera (domyslnie 5000) | Nie |
| `SUPABASE_URL` | URL projektu Supabase | Tak |
| `SUPABASE_KEY` | Klucz API Supabase | Tak |
| `JWT_SECRET` | Sekret do podpisywania tokenow | Tak |

---

## Wdrozenie na Render.com

1. Stworz nowy Web Service na Render
2. Polacz z repozytorium GitHub
3. Ustaw zmienne srodowiskowe
4. Build Command: `npm install`
5. Start Command: `npm start`

---

## Magazyn Danych

Backend uzywa pamieci in-memory dla:
- Reklam
- Kuponow
- Opinii
- Czatow
- Konfiguracji video

**Uwaga:** Dane te sa tracone po restarcie serwera. Dla trwalych danych uzywaj Supabase.

---

## Kontakt

W razie pytan technicznych skontaktuj sie z zespolem deweloperskim.

---

*Dokumentacja wygenerowana: grudzien 2024*
