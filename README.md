Priekš projekta nepieciešams ieinstelēt [Node v24](<[node](https://nodejs.org/en/download)>)

Sākotnējā instalācija:

```bash
    pnpm install
```

Izveido `/.env` failu

```
    DATABASE_URL="file:./dev.db"
    JWT_SECRET="NOMAINI_ŠO"
```

Uzģenerē Prisma client datu bāzei

```bash
    npx prisma generate
```

Palaid mājaslapu testa režīmā

```bash
    npm run dev
```

Atver [http://localhost:3000](http://localhost:3000), lai redzētu mājaslapu
