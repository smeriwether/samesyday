# Samesy Day

A one-page static site that calculates the next day a person and a cat or dog are the same age, using pet human-equivalent age curves instead of matching birthdays or calendar dates.

## Development

```sh
npm install
npm run check
python3 -m http.server 4173 --directory public
```

Open `http://localhost:4173`.

`npm test` runs the calculator's deterministic date-math tests without starting a browser.

## Deployment

Cloudflare Pages deploys automatically from `main`.
