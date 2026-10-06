# Mes Stats Garmin pour Claude

Extension Chrome qui ajoute tes données Garmin Connect à une conversation Claude en un clic : activités, détail des séances, sommeil, HRV, FC au repos, stress, Body Battery, VO2 max, statut d'entraînement et prédictions de course.

**100 % local.** L'extension lit tes données depuis ta session Garmin Connect déjà ouverte dans Chrome et les joint à ton message dans claude.ai. Aucun serveur, aucun compte à créer, aucun mot de passe demandé, rien n'est stocké ni envoyé ailleurs.

> Projet indépendant, non affilié à Garmin ni à Anthropic. Garmin et Garmin Connect sont des marques de Garmin Ltd. Claude est une marque d'Anthropic.

## Installation

**Depuis le Chrome Web Store** (recommandé) : _lien bientôt disponible_.

**En mode développeur** (pour tester la dernière version) :

1. Télécharge ce dépôt (bouton vert **Code > Download ZIP**) et décompresse-le.
2. Ouvre `chrome://extensions` dans Chrome.
3. Active **Mode développeur** en haut à droite.
4. Clique sur **Charger l'extension non empaquetée** et choisis le dossier décompressé.

Fonctionne aussi sur Edge, Brave et les autres navigateurs basés sur Chrome.

## Utilisation

1. Connecte-toi une fois à [connect.garmin.com](https://connect.garmin.com) dans ton navigateur.
2. Ouvre une conversation sur [claude.ai](https://claude.ai).
3. Clique sur le bouton orange **⌚ Garmin** en bas à droite.
4. Choisis la période, le sport et si tu veux le détail de chaque séance.
5. Clique sur **Ajouter à la conversation** : le fichier est joint à ton message. Pose ta question et envoie.

Tu peux aussi cliquer sur l'icône de l'extension dans la barre de Chrome pour copier le texte ou télécharger le fichier `.md`.

### Exemples de questions à poser à Claude

- « Analyse ma récupération cette semaine, est-ce que je peux faire une séance intense demain ? »
- « Compare mes sorties en zone 2 depuis 3 mois : est-ce que mon allure progresse à FC égale ? »
- « Prépare-moi un plan de 8 semaines pour passer sous les 55 min au 10 km. »
- « Est-ce que mon sommeil influence ma HRV et ma Readiness ? »

## Données récupérées

| Partie | Contenu |
|---|---|
| État de forme | VO2 max, statut d'entraînement, charge aiguë et chronique, équilibre de charge, prédictions 5 km / 10 km / semi / marathon |
| Activités | Date, type, distance, durée, allure ou vitesse, FC moyenne et max, dénivelé, effet d'entraînement, charge, calories |
| Détail des séances (option) | Course : tours, zones cardio, cadence, foulée, contact au sol, puissance, météo. Muscu : séries, répétitions, charges |
| Journées | Sommeil et phases, score de sommeil, HRV, FC au repos, stress, Body Battery, Readiness, pas. Au-delà de 4 semaines, les jours plus anciens sont résumés par semaine |

## Limites

- L'extension utilise l'API interne du site Garmin Connect, pas une API officielle. Si Garmin modifie son site, elle peut cesser de fonctionner jusqu'à une mise à jour.
- Les données dépendent de ta montre : pas de HRV ni de Readiness si ton modèle ne les mesure pas.
- Sur 1 an, la récupération prend quelques minutes.

## Confidentialité

Voir [PRIVACY.md](PRIVACY.md). En résumé : rien ne quitte ton navigateur, sauf le fichier que tu choisis toi-même de joindre à ta conversation Claude.

## Développement

```
manifest.json      Manifeste Chrome (MV3)
collector.js       Récupération et mise en forme des données (exécutée dans l'onglet Garmin Connect)
background.js      Service worker : relie le bouton claude.ai à l'onglet Garmin
claude-button.js   Bouton et panneau injectés dans claude.ai
popup.html / .js   Fenêtre de l'icône de l'extension
icons/             Icônes générées par store/make_images.py
store/             Textes et images pour le Chrome Web Store
scripts/package.sh Construit le .zip à envoyer au Chrome Web Store
```

Régénérer les images : `uv run --no-project --with pillow python store/make_images.py`

Construire le paquet : `bash scripts/package.sh`

## Licence

MIT, voir [LICENSE](LICENSE).
