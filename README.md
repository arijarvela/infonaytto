# Infonäyttö – v4 (Firebase-tallennus, ICS, sää)

## Nopeasti käyttöön
1. Pura tämä paketti.
2. Lataa kaikki tiedostot GitHub-repoon **infonaytto** (myös `.github/workflows/deploy.yml`).
3. Lisää GitHubissa Secrets (Actions):
   - `VITE_OWM_API_KEY`
   - `VITE_FB_API_KEY`
   - `VITE_FB_AUTH_DOMAIN`
   - `VITE_FB_PROJECT_ID`
   - `VITE_FB_STORAGE_BUCKET`
   - `VITE_FB_MESSAGING_SENDER_ID`
   - `VITE_FB_APP_ID`
4. Commit → Actions rakentaa ja julkaisee Pagesiin.
5. Avaa: `https://<käyttäjänimi>.github.io/infonaytto/`.

## Paikallisesti
```bash
npm install
npm run dev
```

## Ominaisuudet
- Sää + 48 h tuntiennuste (OWM)
- Wilma ICS -lukujärjestys, Onervan 75 min → kaksi slottia
- Asetukset-dialogi
- Firebase Firestore -pilvitallennus (compat-CDN, ei npm-riippuvuutta)
