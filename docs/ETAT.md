# Cocarde — état

## 29/10/2026 — v2
- Synchro Garmin fiabilisée : délai max 20 s par requête (plus de synchro figée), nouvel essai toutes les 10 min tant que la nuit du jour manque, à chaque retour au premier plan et au retour du réseau. Diagnostic en clair : « Dernière nuit reçue » et côté de la panne (app ↔ Intervals.icu, ou Garmin → Intervals.icu).
- Plan adaptatif (`src/domain/progression.ts`, `src/domain/adapt.ts`) : retard/avance en semaines par épreuve, renforts hebdo plafonnés (2 épreuves, +10 % de km course, rien en décharge/test/simulation/affûtage/fatigue), allures recalculées sur la VMA estimée du dernier 3000 m (÷ 0,93).
- Écran Perfs : note actuelle, statut par épreuve, « où gagner des points », adaptations de la semaine.
- Allègement : écran du jour sans frise ni pastilles, 4 mesures du matin (+ poids les jours de pesée), rappels réduits à GTG et pesée, Santé en 4 graphiques, Concours sans les échéances passées.
- Vérifié : 20 tests, typecheck, build, captures avec données fictives.
- **Non vérifié** : la cause réelle de l'arrêt des données depuis le 24/10 (pas d'accès aux données de Romain) ; l'app l'affiche désormais.

## 24/10/2026 — v1
- Livré : 5 écrans + réglages, import Intervals.icu, garde-fou, barème, plan S1→S23, sauvegarde .json, PWA.
- Vérifié : 12 tests du domaine, typecheck, build, captures mobile/ordinateur clair/sombre avec données fictives et API simulée.
- **Non vérifié** : appel réel à Intervals.icu depuis le téléphone (clé personnelle, CORS) → à tester par Romain.
- À valider sur iPhone : installation sur l'écran d'accueil, synchro du matin, champs reçus (carte diagnostic des Réglages).

## Prochaines étapes possibles
1. Recalage des allures après le test S7 (semaine du 16/11).
2. Synchronisation Firebase si usage sur plusieurs appareils.
