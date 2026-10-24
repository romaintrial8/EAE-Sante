# Cocarde — spécifications techniques

- **Pile** : TypeScript strict, React 19 sans bibliothèque d'état, esbuild (`scripts/build.mjs`), tests `node --test` + tsx, graphiques SVG maison, PWA.
- **Hébergement** : GitHub Pages via `.github/workflows/publier.yml` (tests → typecheck → build → déploiement). Copie du workflow dans `github-workflows/`.
- **Arborescence** : `src/domain/` calculs purs (aucun import navigateur) · `src/data/` IndexedDB, store, actions, synchro · `src/screens/` écrans · `src/ui/` composants, graphiques, routeur par hash.
- **Stockage** : IndexedDB `cocarde`, store `records`, clé `collection/id`. Collections : `wellness` (import), `checkin` (saisie, prime), `activity` (import), `tests`, `done` (éléments cochés), `deadlines`. Suppression = pierre tombale. Préférences d'appareil en localStorage (`cocarde.icu`, `cocarde.sync`, `cocarde.theme`).
- **Intervals.icu** : `GET /api/v1/athlete/{id}/wellness` et `/activities`, `oldest`/`newest`, authentification Basic `API_KEY:<clé>`. `id = 0` = propriétaire de la clé. Mapping dans `src/domain/intervals.ts`.
- **Garde-fou** (`src/domain/health.ts`) : séance qualité → alerte si Body Battery < 40, ou VFC < (moyenne − 1 σ des 28 nuits précédentes, ≥ 10 nuits) deux nuits de suite. Statut VFC Garmin saisi = prioritaire.
- **Barème** (`src/domain/bareme.ts`) : arrêté du 30/08/2021, hommes, arrondi à la valeur inférieure.
- **Plan** (`src/domain/plan.ts`) : généré jour par jour depuis la passation v2 ; exceptions datées (Thanksgiving, Noël, Jour de l'An, oraux blancs, pentathlons, période France).
- **Service worker** : cache versionné (SHA-256 de `dist/`), installation en `cache: 'reload'`, navigations servies depuis le cache, Intervals.icu toujours en réseau.
- **Outils** (non publiés) : `tools/icons.mjs` (icônes), `tools/shots.mjs` (captures avec données fictives et API simulée).
