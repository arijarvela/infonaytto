# infonaytto

- Tumma teema
- Sää (OpenWeatherMap): nykyinen + 48 h tuntiennuste, tuuli (m/s)
- Lukujärjestys: näytetään tänään / klo 18 jälkeen seuraava päivä
- Wilma-ICS: asetuksissa linkit per lapsi + valinnainen ICS-proxy
- Automaattinen ICS-haku sunnuntaisin klo 12 jälkeen (kerran päivässä)
- 45/75 min jaksojen pyöristys lähimpään tasatuntiin
- GitHub Pages -workflow valmiina

## Käyttöönotto (GitHub selaimella)
1. Luo public-repo **infonaytto**.
2. Lataa tämän paketin sisältö repoosi.
3. Settings → Pages: Source = **GitHub Actions**.
4. Settings → Secrets → Actions: lisää `VITE_OWM_API_KEY` (OpenWeatherMap API key).
5. Tee commit → Actions rakentaa ja julkaisee: `https://<käyttäjä>.github.io/infonaytto/`.
