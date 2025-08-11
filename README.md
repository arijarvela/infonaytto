# Kodin infonäyttö (kalenteriton versio)

- Tumma teema
- Sää (OWM): nykyinen + 48h tuntiennuste, sisältää tuulen (m/s)
- Lukujärjestykset: näytetään vain **tänään**, ja klo 18 jälkeen **seuraava päivä**
- Kello
- Ei kalenterinäkymää

## Käyttöönotto GitHubin selaimesta

1. Luo public-repo.
2. Lataa tämän paketin tiedostot repoosi.
3. Aseta **Settings → Pages**: Source = **GitHub Actions**.
4. Lisää **Settings → Secrets → Actions**: `VITE_OWM_API_KEY` (OpenWeatherMap API-key).
5. Muokkaa `vite.config.js` `base` vastaamaan reposi nimeä (esim. `/kotinaytto/`).
6. Push → Actions rakentaa ja julkaisee.

## Asetukset sovelluksessa
- Paikkakunta
- Lapset
- Viikkolukujärjestys

Tiedot tallentuvat selaimen `localStorageen`.
