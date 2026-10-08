# Fiche Chrome Web Store : textes à copier-coller (version 1.1.0)

Tout ce que le formulaire du Chrome Web Store demande, dans l'ordre des onglets du tableau de bord développeur.
La fiche existe en deux langues : anglais (langue par défaut) et français.

---

## Onglet « Fiche Play Store » (Store listing)

Le **nom** et le **résumé** viennent du manifeste (`_locales/en` et `_locales/fr`) : rien à saisir.

- Nom : `My Garmin Stats for Claude` / `Mes Stats Garmin pour Claude`
- Résumé : `Add your Garmin Connect stats (activities, sleep, HRV, fitness) to Claude or ChatGPT in one click. 100% local.`

Nom de secours si Google refuse à cause des marques : `My Watch Stats` / `Mes Stats Montre` (dans `_locales/*/messages.json` et `i18n.js`).

### Description en anglais (langue par défaut)

```
Give your AI all your training data in one click, to analyze your fitness and recovery and plan your training.

HOW IT WORKS
1. Sign in to Garmin Connect in your browser, as usual.
2. Open a conversation on claude.ai or chatgpt.com.
3. Click the "⌚ Garmin" button, pick a period and a sport.
4. The file is attached to your message. Ask your question.

WHAT'S INCLUDED
• Fitness status: VO2 max, training status, acute and chronic load, 5K, 10K, half marathon and marathon predictions
• Activities: distance, duration, pace, average and max HR, elevation gain, training effect, load
• Session details (optional): laps and intervals, HR zones, cadence, stride, power, weather, strength sets
• Days: bedtime and wake-up time, sleep and sleep stages, HRV, resting HR, Body Battery, readiness, steps
• Stress: rest / low / medium / high breakdown, readings every 3 minutes
• Only Garmin's own numbers, no averages or interpretation added
• From 1 day to 1 year, or only the new data since your last export
• Filter by sport (running, strength, cycling, swimming, walking)
• English or French, switch anytime

100% LOCAL AND FREE
• No account, no password: the extension uses your existing Garmin Connect session.
• No server: your data only goes through your browser, then to the conversation you choose.
• No tracking, no ads, no sports data stored.
• Open source.

EXAMPLE QUESTIONS
• "Am I recovered enough for an interval session tomorrow?"
• "Has my zone 2 pace improved over the last 3 months?"
• "Build me an 8-week plan for my next 10K."

Independent project, not affiliated with Garmin, Anthropic or OpenAI. Garmin and Garmin Connect are trademarks of Garmin Ltd. Claude is a trademark of Anthropic. ChatGPT is a trademark of OpenAI.
```

### Description en français

```
Donne à ton IA toutes tes données d'entraînement en un clic, pour analyser ta forme, ta récupération et préparer tes plans.

COMMENT ÇA MARCHE
1. Connecte-toi à Garmin Connect dans ton navigateur, comme d'habitude.
2. Ouvre une conversation sur claude.ai ou chatgpt.com.
3. Clique sur le bouton « ⌚ Garmin », choisis la période et le sport.
4. Le fichier est joint à ton message. Pose ta question.

CE QUI EST INCLUS
• État de forme : VO2 max, statut d'entraînement, charge aiguë et chronique, prédictions 5 km, 10 km, semi et marathon
• Activités : distance, durée, allure, FC moyenne et max, dénivelé, effet d'entraînement, charge
• Détail des séances (option) : tours et fractions, zones cardio, cadence, foulée, puissance, météo, séries de musculation
• Journées : heures de coucher et de réveil, sommeil et phases, HRV, FC au repos, Body Battery, Readiness, pas
• Stress : répartition repos / faible / moyen / élevé, mesures toutes les 3 minutes
• Uniquement les chiffres de Garmin, sans moyenne ni interprétation ajoutée
• De 1 jour à 1 an, ou seulement les nouvelles données depuis ton dernier envoi
• Filtrable par sport (course, muscu, vélo, natation, marche)
• En anglais ou en français, au choix

100 % LOCAL ET GRATUIT
• Aucun compte à créer, aucun mot de passe demandé : l'extension utilise ta session Garmin Connect déjà ouverte.
• Aucun serveur : tes données ne passent que par ton navigateur, puis par la conversation que tu choisis.
• Aucun suivi, aucune publicité, aucune donnée sportive stockée.
• Code source ouvert.

EXEMPLES DE QUESTIONS
• « Est-ce que je suis assez récupéré·e pour une séance de fractionné demain ? »
• « Mon allure en zone 2 progresse-t-elle depuis 3 mois ? »
• « Prépare-moi un plan de 8 semaines pour mon prochain 10 km. »

Projet indépendant, non affilié à Garmin, Anthropic ni OpenAI. Garmin et Garmin Connect sont des marques de Garmin Ltd. Claude est une marque d'Anthropic. ChatGPT est une marque d'OpenAI.
```

**Catégorie** : `Productivité` (ou `Santé et remise en forme` si la catégorie est proposée)

### Images

Les mêmes fichiers existent en anglais (`en`) et en français (`fr`), générés par `store/make_store_images.py`.

| Élément | Anglais | Français |
|---|---|---|
| Icône 128x128 | `icons/icon128.png` | même fichier |
| Vignette promo 440x280 | `store/en/promo-440x280.png` | `store/fr/promo-440x280.png` |
| Bannière 1400x560 | `store/en/banniere-1400x560.png` | `store/fr/banniere-1400x560.png` |
| Captures 1280x800 (5 maximum) | `store/screenshots/en/` | `store/screenshots/fr/` |

Ordre des captures : 1-claude, 2-chatgpt, 3-file, 4-features, 5-privacy.

**Site web** : `https://github.com/Anna-2W/mes-stats-garmin-claude`
**URL d'assistance** : `https://github.com/Anna-2W/mes-stats-garmin-claude/issues`

---

## Onglet « Pratiques de confidentialité » (Privacy practices)

**Objectif unique** (Single purpose) :

```
Exporter les données sportives et de santé de l'utilisateur depuis sa session Garmin Connect et les joindre, à sa demande, à une conversation claude.ai ou chatgpt.com.
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

Scripts de contenu sur `https://claude.ai/*` et `https://chatgpt.com/*` :
```
Affiche le bouton « ⌚ Garmin » dans claude.ai et chatgpt.com et joint le fichier de données au message que l'utilisateur est en train d'écrire. Le script ne lit pas les conversations.
```

`storage` (nouvelle dans la 1.1.0) :
```
Conserve uniquement, en local, la date du dernier envoi de l'utilisateur (pour l'option « Depuis mon dernier envoi ») et la langue d'affichage choisie (anglais ou français). Aucune donnée sportive ou de santé n'est stockée.
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

- **Visibilité** : Public (ou « Non répertorié » : installable par lien, invisible dans les recherches)
- **Régions** : toutes
- **Tarif** : gratuit
