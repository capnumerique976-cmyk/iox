# MP-NOTIF-1 phase 1 — Plan

Branche `mp-notif-1-transactional-emails-phase1` depuis `main` à `db36db7`.

## Objectif

Poser l'infrastructure email transactionnelle backend (provider abstrait,
transport mock pour tests + transport `streamTransport` nodemailer pour
diagnostic local), 2 templates FR critiques RFQ, et brancher les 2 hooks
dans `QuoteRequestsService`. **Aucun envoi externe** — pas de SMTP réel,
pas de Resend, pas de réseau.

## Commits prévus

1. `chore(notes): plan MP-NOTIF-1 phase 1`
2. `chore(deps): add nodemailer + @types/nodemailer (backend)`
3. `feat(notif): MP-NOTIF-1 — module + transports + factory + types`
4. `feat(notif): MP-NOTIF-1 — config env (NOTIF_EMAIL_TRANSPORT/FROM/REPLY_TO)`
5. `feat(notif): MP-NOTIF-1 — templates rfq-created-to-seller + rfq-message-created`
6. `feat(quote-requests): MP-NOTIF-1 — branchement send sur create + addMessage`
7. `test(notif): MP-NOTIF-1 — couverture service + transports + templates`
8. `test(quote-requests): MP-NOTIF-1 — assertions sur send appelé avec bons args`
9. `docs(marketplace): MP_NOTIF_1_PHASE_1.md`

## Architecture

```
notif-email/
  notif-email.module.ts
  notif-email.service.ts            // send(input) → SendEmailResult
  notif-email.types.ts              // interfaces SendEmailInput/Result + Template + EmailTransport
  transport.factory.ts              // createTransport(env) → EmailTransport
  transports/
    mock.transport.ts               // accumule en mémoire (getSent, clear)
    smtp-stream.transport.ts        // nodemailer streamTransport (stream → buffer, pas de réseau)
  templates/
    index.ts                        // registry templateId → Template
    rfq-created-to-seller.template.ts
    rfq-message-created.template.ts
```

## Règles strictes

- **Aucun envoi externe** : transport default = `mock`. `smtp-stream`
  utilise `streamTransport: true, jsonTransport: false, buffer: true`.
- **Try/catch** non bloquant dans les services métier : un échec email
  ne casse pas la création RFQ ou de message.
- **i18n FR** dans les templates (sujets + corps).
- **Logger Nest** uniquement, pas de `console.log`.
- **Aucune migration Prisma** (phase 1 pas de table EmailLog).
