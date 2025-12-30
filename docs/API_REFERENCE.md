# BabaTV24 API - Szybka Referencja

## Bazowy URL
```
http://localhost:5000
```

## Publiczne Endpointy (bez autoryzacji)

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/` | GET | Status API |
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
- `GET /api/admin/dashboard` - Statystyki
- `GET /api/admin/users` - Lista uzytkownikow
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
