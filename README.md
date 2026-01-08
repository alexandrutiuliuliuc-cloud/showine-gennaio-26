# showine-gennaio-26

Repo di lavoro locale per il tema Shopify di `showine.myshopify.com`.

## Flusso concordato (SICURO)

- **Preview / sviluppo**: `Release [MASSIMO EDIT - TEST]` (tema "fantasma", non live)
- **Push finale** (solo quando autorizzato): `Release [MASSIMO EDIT - DEV]`

Gli ID sono salvati in `scripts/shopify_env.sh`.

## Comandi

Raccomandazione: esegui i comandi dalla root della repo.

### Pull iniziale (scarica i file del tema DEV in locale)

```bash
./scripts/pull_from_dev.sh
```

### Preview (sincronizza SOLO sul tema TEST)

```bash
./scripts/dev_preview_on_test.sh
```

### Push finale (BLOCCATO di default)

Questo comando è intenzionalmente protetto: richiede `OK_PUSH=YES`.

```bash
OK_PUSH=YES ./scripts/push_to_dev__REQUIRES_OK_PUSH.sh
```
