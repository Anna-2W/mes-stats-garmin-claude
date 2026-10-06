# Fiche Chrome Web Store : textes à copier-coller

Tout ce que le formulaire du Chrome Web Store demande, dans l'ordre des onglets du tableau de bord développeur.

---

## Onglet « Fiche Play Store » (Store listing)

**Nom** (vient du manifeste) : `Mes Stats Garmin pour Claude`

Nom de secours si Google refuse à cause des marques : `Mes Stats Montre` (à changer dans `manifest.json`, `popup.html`, puis relancer `scripts/package.sh` et `store/make_images.py`).

**Résumé** (132 caractères max, vient du manifeste) :

```
Ajoute tes stats Garmin Connect (activités, sommeil, HRV, forme) à une conversation Claude en un clic. 100 % local.
```

**Description détaillée** :

```
Donne à Claude toutes tes données d'entraînement en un clic, pour analyser ta forme, ta récupération et préparer tes plans.

COMMENT ÇA MARCHE
1. Connecte-toi à Garmin Connect dans ton navigateur, comme d'habitude.
2. Ouvre une conversation sur claude.ai.
3. Clique sur le bouton « ⌚ Garmin », choisis la période et le sport.
4. Le fichier est joint à ton message. Pose ta question à Claude.

CE QUI EST INCLUS
• État de forme : VO2 max, statut d'entraînement, charge aiguë et chronique, prédictions 5 km, 10 km, semi et marathon
• Activités : distance, durée, allure, FC moyenne et max, dénivelé, effet d'entraînement, charge
• Détail des séances (option) : tours et fractions, zones cardio, cadence, foulée, puissance, météo, séries de musculation
• Journées : sommeil et phases, HRV, FC au repos, stress, Body Battery, Readiness, pas
• De 7 jours à 1 an, filtrable par sport (course, muscu, vélo, natation, marche)

100 % LOCAL ET GRATUIT
• Aucun compte à créer, aucun mot de passe demandé : l'extension utilise ta session Garmin Connect déjà ouverte.
• Aucun serveur : tes données ne passent que par ton navigateur, puis par la conversation Claude que tu choisis.
• Aucun suivi, aucune publicité, aucune donnée stockée.
• Code source ouvert.

EXEMPLES DE QUESTIONS
• « Est-ce que je suis assez récupéré·e pour une séance de fractionné demain ? »
• « Mon allure en zone 2 progresse-t-elle depuis 3 mois ? »
• « Prépare-moi un plan de 8 semaines pour mon prochain 10 km. »

Projet indépendant, non affilié à Garmin ni à Anthropic. Garmin et Garmin Connect sont des marques de Garmin Ltd. Claude est une marque d'Anthropic.
```

**Catégorie** : `Productivité` (ou `Santé et remise en forme` si la catégorie est proposée)

**Langue** : Français

**Images** :

| Élément | Fichier | Statut |
|---|---|---|
| Icône 128x128 | `icons/icon128.png` | prêt |
| Vignette promo 440x280 | `store/promo-440x280.png` | prêt |
| Captures d'écran 1280x800 (1 minimum, 5 maximum) | `store/screenshots/1-panneau-1280x800.png` | 1 prête, 1 ou 2 de plus recommandées |

**Captures d'écran à prendre** (format 1280x800, sans données que tu ne veux pas montrer) :

1. claude.ai avec le panneau « ⌚ Garmin » ouvert
2. Un message avec le fichier joint et la réponse de Claude
3. La fenêtre de l'icône avec l'aperçu du texte

Astuce : fenêtre Chrome redimensionnée à 1280x800, puis Cmd+Maj+4 puis Espace pour capturer la fenêtre.

**Site web** : `https://github.com/Anna-2W/mes-stats-garmin-claude`
**URL d'assistance** : `https://github.com/Anna-2W/mes-stats-garmin-claude/issues`

---

## Onglet « Pratiques de confidentialité » (Privacy practices)

**Objectif unique** (Single purpose) :

```
Exporter les données sportives et de santé de l'utilisateur depuis sa session Garmin Connect et les joindre, à sa demande, à une conversation claude.ai.
```

**Justification des autorisations** :

`scripting` :
```
Exécute, dans l'onglet connect.garmin.com de l'utilisateur et uniquement quand il clique sur le bouton de l'extension, le script qui lit ses données d'activité avec sa session déjà ouverte et les met en forme.
```

Autorisation d'hôte `https://connect.garmin.com/*` :
```
Nécessaire pour lire les données de l'utilisateur (activités, sommeil, fréquence cardiaque, etc.) depuis sa propre session Garmin Connect. Aucune autre donnée de ce site n'est lue.
```

Script de contenu sur `https://claude.ai/*` :
```
Affiche le bouton « ⌚ Garmin » dans claude.ai et joint le fichier de données au message que l'utilisateur est en train d'écrire. Le script ne lit pas les conversations.
```

**Code distant** (Remote code) : `Non, je n'utilise pas de code distant.`

**Données utilisateur collectées** : cocher uniquement **« Informations de santé »** et **« Activité de l'utilisateur »** si le formulaire le demande pour les données traitées, puis préciser qu'elles ne sont **pas transmises au développeur**.

Cocher les trois attestations :
- Je ne vends pas et ne transfère pas les données utilisateur à des tiers, en dehors des cas d'utilisation approuvés.
- Je n'utilise pas et ne transfère pas les données utilisateur à des fins sans rapport avec l'objectif unique de mon article.
- Je n'utilise pas et ne transfère pas les données utilisateur pour déterminer la solvabilité ou à des fins de prêt.

**URL de la politique de confidentialité** : `https://anna-2w.github.io/mes-stats-garmin-claude/privacy.html`

---

## Onglet « Distribution »

- **Visibilité** : Public (ou « Non répertorié » pour un premier test avec des amis : installable par lien, invisible dans les recherches)
- **Régions** : toutes
- **Tarif** : gratuit
