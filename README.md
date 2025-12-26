# pick-sort-1m

Single-service app: Express serves API and the built React frontend.

## Local development

1) Install deps:
```
npm install
```

2) Run dev servers (API + Vite):
```
npm run dev
```

## Production build

Build server + client:
```
npm run build
```

Run the server (serves API + client/dist):
```
npm run start
```

Open:
- http://localhost:3001

## Render deployment

Create a new Web Service from this repo.

Build command:
```
npm install && npm run build
```

Start command:
```
npm run start
```

Environment:
- `PORT` (Render sets this automatically)

Deployment URL:
- add after deploy
