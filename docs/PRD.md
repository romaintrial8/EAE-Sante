# Cocarde — produit

**Pour qui** : Romain, candidat au concours externe sur titres de l'École de l'air et de l'espace (session 2027, pilote), en stage à Little Rock jusqu'à fin février 2027.

**But** : suivre en un seul endroit la préparation du concours : le plan S1→S23 de la passation v2 (04/10/2026), la santé quotidienne lue sur la montre Garmin, les tests sportifs notés au barème officiel et les échéances administratives.

## Périmètre v1 (livré)
1. **Aujourd'hui** : séance du jour (contenu de la passation, allures et temps de passage), garde-fou automatique sur les séances qualité, blocs concours et rappels à cocher, prochaines échéances.
2. **Plan** : semaine par semaine, km prévus vs km Garmin, taux de réalisation.
3. **Santé** : sommeil (score, durée), VFC avec zone habituelle, FC de repos, poids vs trajectoire cible, Body Battery ; check-in manuel qui prime sur l'import.
4. **Tests** : saisie des 5 épreuves, note /20 au barème (arrêté du 30/08/2021), jalons S7/S15/S20/Jour J, moyenne estimée.
5. **Concours** : comptes à rebours, échéances à cocher, fiches de culture G, oraux blancs.
6. **Réglages** : connexion Intervals.icu, diagnostic, sauvegarde .json, thème, aide.

## Données Garmin
Montre → Garmin Connect → Intervals.icu (partenaire officiel, synchro cloud) → Cocarde, à l'ouverture de l'app (au plus toutes les 3 h, relit 7 jours). Lecture seule. Body Battery non transmis en standard : saisie manuelle si besoin.

## Hors périmètre v1 (décisions)
- Synchronisation entre appareils (Firebase) : étape suivante si l'app est utilisée sur plusieurs appareils.
- Notifications : le calendrier iPhone (.ics) s'en charge déjà.
- Recalage des allures après S7/S15 : mise à jour du plan dans le code (`src/domain/plan.ts`).

## Points ouverts (passation §9)
Dates d'inscription et d'épreuves 2027, dates des oraux blancs, vol retour, bassin en mètres ou yards, CEMPN, certificat médical. Horaires de stage : la passation dit 07 h 00 – 15 h 30 ; à confirmer.
