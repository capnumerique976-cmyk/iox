# Prompt 16 — Garbage collect : stashs + branches legacy

## Contexte

Après la cascade #15, le repo IOX a accumulé du résidu :

- **2 stashs** :
  - `stash@{0}` `claude-settings` (sur `mp-offer-view-1-seller-detail`) → +8 lignes dans `.claude/settings.json` (token-economy à persister sur main).
  - `stash@{1}` `linter-formatting-mandat-cascade-4-resume` (sur `mp-edit-product-3-light-main-media`) → reformatages linter sur ~120 fichiers backend (auth, marketplace-catalog, seed-demo…). À drop (avec patch d'archive de sécurité), un futur `pnpm lint --fix` pourra rejouer si besoin.
- **5 branches legacy** dont aucune n'a de commit perdu sur main :
  - `lot-7-bis`, `lot-8`, `lot-9` → déjà mergées dans `main`. `git branch -D` direct.
  - `fp-1-seasonality` (1 commit unique `b6b56b3`) et `fp-2-certifications` (2 commits uniques `78a88be` + `b6b56b3`) → refait et remergé via les PR FP-1/FP-2 ultérieures (preuve : `seasonalityMonth=APR` renvoie 7 en prod, FP-2 certifications est intégré au schéma). On **archive en tags Git** avant suppression pour zéro perte d'historique.
- **Branches remote à nettoyer** : `origin/fp-1-seasonality`, `origin/lot-8`, `origin/lot-9`.

## Périmètre

Mode : **LOCAL + REMOTE git** (pas de build, pas de migration, pas de deploy). Push origin uniquement pour les suppressions de branches remote et pour le commit token-economy. Aucune migration Prisma. Aucun changement de code applicatif (sauf ajout de `.claude/settings.json` au tracking).

Branche cible : **`main` directement** pour le commit token-economy (chore safe, pas de PR — facultatif si tu préfères passer par une PR de cohérence, voir option B en fin de prompt).

## Lots

### LOT 1 — Sauvegardes préventives (0 risque)

1. `git fetch origin --prune` (sync les références remote).
2. Créer 5 tags d'archive avant toute suppression :
   ```
   git tag archive/2026-04-27/fp-1-seasonality fp-1-seasonality
   git tag archive/2026-04-27/fp-2-certifications fp-2-certifications
   git tag archive/2026-04-27/lot-7-bis lot-7-bis
   git tag archive/2026-04-27/lot-8 lot-8
   git tag archive/2026-04-27/lot-9 lot-9
   ```
3. Sauvegarder le diff de `stash@{1}` linter en patch dans `notes/archive/` :
   ```
   mkdir -p notes/archive
   git stash show stash@{1} -p > notes/archive/2026-04-27-linter-formatting-stash.patch
   ```
   (Le fichier `notes/archive/` est dans `.gitignore` côté `notes/` ? Vérifier — sinon ajouter `notes/archive/` à `.gitignore` ou commiter le patch.)

**Preuves** :
```
git tag --list "archive/2026-04-27/*"
ls -la notes/archive/2026-04-27-linter-formatting-stash.patch
```

### LOT 2 — Persister `.claude/settings.json` (stash@{0}) en commit dédié sur main

1. S'assurer d'être sur `main` propre :
   ```
   git checkout main
   git status
   ```
2. Si `.claude/settings.json` est listé dans `.gitignore`, le retirer de l'ignore :
   ```
   grep -n "settings.json" .gitignore
   ```
   - Si présent : éditer `.gitignore` pour retirer la ligne (commit dans le même commit que le settings).
3. Pop le stash et committer en commit dédié :
   ```
   git stash pop stash@{0}
   git add .claude/settings.json .gitignore
   git diff --cached --stat
   git commit -m "chore(claude): persiste token-economy settings (.claude/settings.json)"
   ```
4. Push direct sur main (chore, pas de PR nécessaire — sauf option B) :
   ```
   git push origin main
   ```

**Preuves** :
```
git log --oneline -3 origin/main
cat .claude/settings.json
git stash list  # stash@{0} doit avoir disparu
```

### LOT 3 — Drop `stash@{1}` linter

1. Vérifier la sauvegarde patch existe (LOT 1.3) :
   ```
   wc -l notes/archive/2026-04-27-linter-formatting-stash.patch
   ```
2. Drop le stash :
   ```
   git stash drop stash@{0}   # devenu stash@{0} après le pop du LOT 2
   ```
   (Vérifier `git stash list` avant de drop pour pointer le bon index — si LOT 2 a fait `pop stash@{0}`, l'ancien `stash@{1}` est devenu `stash@{0}`.)

**Preuves** :
```
git stash list   # doit être vide
ls -la notes/archive/2026-04-27-linter-formatting-stash.patch  # patch d'archive intact
```

### LOT 4 — Suppression branches locales + remote

1. Suppression locale (force pour les non-mergées, déjà archivées en tags) :
   ```
   git branch -D fp-1-seasonality fp-2-certifications lot-7-bis lot-8 lot-9
   ```
2. Suppression remote :
   ```
   git push origin --delete fp-1-seasonality lot-8 lot-9
   ```
   (Pas de `origin/fp-2-certifications`, `origin/lot-7-bis` — déjà absents.)

**Preuves** :
```
git branch -a | grep -E "fp-1-seasonality|fp-2-certifications|lot-7-bis|lot-8|lot-9" || echo "OK aucune branche legacy"
git fetch origin --prune
```

### LOT 5 — Validations finales

1. État repo propre :
   ```
   git status
   git log --oneline origin/main | head -3
   ```
2. main toujours fonctionnel (compile + test rapide non bloquant) :
   ```
   pnpm install
   pnpm -w typecheck
   ```
3. Tags d'archive accessibles :
   ```
   git tag --list "archive/*"
   git show archive/2026-04-27/fp-1-seasonality --stat | head -10
   ```

## Preuves anti-hallucination obligatoires (à recopier en fin de rapport)

```
# 1. Tags d'archive créés
git tag --list "archive/2026-04-27/*"

# 2. Patch linter sauvegardé
ls -la notes/archive/2026-04-27-linter-formatting-stash.patch

# 3. Commit token-economy sur main
git log --oneline origin/main | head -3

# 4. Settings.json tracké
git ls-files .claude/settings.json

# 5. Stash list vide
git stash list

# 6. Aucune branche legacy locale
git branch | grep -E "fp-1-seasonality|fp-2-certifications|lot-7-bis|lot-8|lot-9" || echo "OK"

# 7. Aucune branche legacy remote (après fetch --prune)
git fetch origin --prune
git branch -r | grep -E "fp-1-seasonality|lot-8|lot-9" || echo "OK"

# 8. typecheck OK
pnpm -w typecheck 2>&1 | tail -5
```

## Contraintes

- **Pas de force-push** sur main. Push standard uniquement.
- **Pas de migration Prisma**. Pas de deploy VPS.
- **Pas de modification du code applicatif** (sauf `.claude/settings.json` + éventuellement `.gitignore`).
- En cas de conflit lors du `stash pop` LOT 2 : `git stash pop` puis résoudre conflit `.claude/settings.json` à la main (préférer la version du stash si on a configuré le token-economy en local, sinon merger). **Stop et demander confirmation** avant de drop le stash en cas de doute.
- Si `pnpm -w typecheck` échoue : revenir au commit précédent (`git reset --hard HEAD~1`) avant push, et signaler.

## Option B (alternative au LOT 2 push direct sur main)

Si tu préfères passer par une PR pour le commit token-economy :
```
git checkout -b chore-claude-settings
git stash pop stash@{0}
git add .claude/settings.json .gitignore
git commit -m "chore(claude): persiste token-economy settings"
git push -u origin chore-claude-settings
gh pr create --title "chore(claude): persiste token-economy settings" --body "Persiste les settings .claude/settings.json (outputStyle=concise, MAX_THINKING_TOKENS=10000, etc.) pour économiser ~25-45% des tokens sur les mégas-mandats." --base main
gh pr merge --squash --auto
```
Puis revenir sur main, `git pull --rebase`, et reprendre LOT 3.

## TL;DR rapport attendu

```
Cascade #16 nettoyage — livrée ✅
- 5 tags archive/2026-04-27/* créés (zero perte d'historique).
- stash@{0} claude-settings → commit chore(claude): … sur main (sha XXX).
- stash@{1} linter-formatting → patch sauvegardé + drop.
- 5 branches legacy supprimées (locale + remote).
- main typecheck OK, working tree propre.
```
