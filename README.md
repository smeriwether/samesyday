# Samesy Day

A one-page static site that calculates the next day a person and a cat or dog are the same age, using pet human-equivalent age curves instead of matching birthdays or calendar dates.

## Development

```sh
npm install
npm run build
python3 -m http.server 4173 --directory public
```

Open `http://localhost:4173`.

## Deployment

Cloudflare Pages deploys automatically from `main`.
