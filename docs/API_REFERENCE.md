# BabaTV24 API - Szybka Referencja v2.3.1

## Bazowy URL
```
Production: https://babatvbackend.onrender.com
Development: http://localhost:5000
```

## Publiczne Endpointy (bez autoryzacji)

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/` | GET | Status API (version, endpoints) |
| `/api/public/stats` | GET | Statystyki (usersCount, maxPublicId) |
| `/api/stats/users-count` | GET | Landing page counter (usersCount, maxPublicId) |
| `/api/ads` | GET | Lista aktywnych reklam |
| `/api/ads/:id` | GET | Szczegoly reklamy (deep-link) |
| `/api/testimonials` | GET | Zatwierdzone opinie |
| `/api/testimonials/submit` | POST | Wyslij nowa opinie |
| `/api/coupons/validate` | POST | Sprawdz kupon |
| `/api/video/current` | GET | Aktualny stream |
| `/api/video/playlist` | GET | Playlista video |

## Chronione Endpointy (wymagaja JWT)

### Autoryzacja
```
Header: Authorization: Bearer <token>
```

### Admin Panel
- `POST /api/admin/login` - Logowanie (opcjonalne 2FA)
- `POST /api/admin/verify-2fa` - Weryfikacja kodu Google Authenticator
- `POST /api/admin/logout` - Wylogowanie (czyści cookies, zwraca frontendAction)
- `GET /api/admin/stats` - Dashboard statystyki (30s cache)
- `GET /api/admin/users` - Lista uzytkownikow (paginacja, filtry)
- `GET /api/admin/users/:id` - Pobierz uzytkownika (UUID/publicId/USR-xxx)
- `POST /api/admin/users` - Tworz uzytkownika
- `PUT /api/admin/users/:id` - Edytuj uzytkownika
- `PATCH /api/admin/users/:id` - Czesciowa aktualizacja
- `DELETE /api/admin/users/:id` - Usun uzytkownika
- `POST /api/admin/users/:id/send-invite` - Wyslij zaproszenie email
- `GET /api/admin/users/export?format=csv|xlsx` - Eksport (publicId, id, email, ...)
- `POST /api/admin/users/import` - Import CSV/XLSX (multipart)
- `POST /api/admin/users/:id/toggle-premium` - Premium on/off
- `POST /api/admin/users/:id/tags` - Dodaj tag

### Reklamy (Admin)
- `POST /api/ads/admin/create` - Nowa reklama
- `PUT /api/ads/admin/:id` - Edytuj
- `DELETE /api/ads/admin/:id` - Usun

### Kupony (Admin)
- `POST /api/coupons/admin/create` - Nowy kupon
- `GET /api/coupons/admin/all` - Lista
- `POST /api/coupons/apply` - Zastosuj

### Opinie (Admin)
- `GET /api/testimonials/admin/pending` - Oczekujace
- `POST /api/testimonials/admin/approve/:id` - Zatwierdz

### Czat
- `POST /api/chat/contact-admin` - Kontakt z adminem
- `GET /api/chat/admin/support` - Wiadomosci wsparcia
- `POST /api/chat/admin/reply` - Odpowiedz

### Video (Admin)
- `POST /api/video/admin/set-loop` - Ustaw stream
- `POST /api/video/admin/toggle` - Wlacz/wylacz

### Push
- `POST /api/push/send-ad` - Push o reklamie
- `POST /api/push/send-broadcast` - Broadcast
- `POST /api/admin/push/send` - Push admin z targetowaniem:
  - `userIds` - lista UUID
  - `publicIds` - lista public_id
  - `plans` - filtruj po planach (VIP, GOLD, ...)
  - `roles` - filtruj po rolach (admin, moderator, user)
  - `sendToAll` - broadcast do wszystkich
  - `target` - alternatywny format: { all, userIds, plans, roles }

### SMS
- `POST /api/sms/send` - Wyslij SMS
- `POST /api/sms/send-bulk` - SMS masowy

## Kody odpowiedzi

| Kod | Znaczenie |
|-----|-----------|
| 200 | Sukces |
| 400 | Bledne dane |
| 401 | Brak autoryzacji |
| 404 | Nie znaleziono |
| 500 | Blad serwera |

## Przyklad odpowiedzi sukcesu
```json
{
  "success": true,
  "data": { ... }
}
```

## Przyklad odpowiedzi bledu
```json
{
  "success": false,
  "error": "Opis bledu"
}
```

## Przyklad odpowiedzi 404 z details
```json
{
  "success": false,
  "error": "User not found",
  "details": { "param": "999" }
}
```

## Formaty ID uzytkownika

Endpointy z `:id` akceptuja:
- UUID: `ea4c6e19-1234-5678-abcd-123456789abc`
- UUID bez kresek: `ea4c6e191234567890abcdef01234567`
- publicId (liczba): `371`
- Format USR: `USR-371`

## Frontend Integration

### Wyswietlanie ID
- UI pokazuje `publicId` jako "ID" (np. #371)
- Operacje API uzywaja `id` (UUID)

### Logout
Po wylogowaniu backend zwraca `frontendAction: "clear_local_storage"` - usun token z localStorage.

### Generowane haslo
Przy tworzeniu uzytkownika bez hasla, backend zwraca `generatedPassword` - wyswietl jednorazowo!

---

**Wersja:** 2.3.1 | **Data:** 2025-01-13
