# Publier Mes Stats Garmin pour l'IA : check-list

Ce qui est prêt est coché. Le reste demande ton compte ou ton action.

## 0. Avant tout

- [ ] Tester la v1.0.0 en mode développeur : course + 4 semaines + détail, muscu + détail, 1 an sans détail
- [ ] Vérifier la météo (°C) et les charges de muscu (kg) dans le détail des séances
- [x] Contact de la politique de confidentialité : issues GitHub
- [ ] Vérifier le nom dans `LICENSE`

## 1. Mettre le code sur GitHub (gratuit)

```bash
cd ~/Desktop/TODO/garmin-claude-extension
git init
git add .
git commit -m "Mes Stats Garmin pour Claude 1.0.0"
gh repo create mes-stats-garmin-claude --public --source . --push
```

Puis activer la page de confidentialité :
GitHub > dépôt > **Settings > Pages** > Source : **Deploy from a branch**, branche `main`, dossier `/docs`.

L'URL sera : `https://anna-2w.github.io/mes-stats-garmin-claude/privacy.html`

## 2. Créer le compte développeur Chrome Web Store (5 $, une fois)

1. Va sur https://chrome.google.com/webstore/devconsole
2. Connecte-toi avec un compte Google (idéalement perso, pas celui du travail)
3. Accepte le contrat et paie les 5 $
4. Vérifie ton adresse e-mail de contact

## 3. Envoyer l'extension

1. Construire le paquet : `bash scripts/package.sh` (crée `dist/mes-stats-garmin-claude-1.0.0.zip`)
2. Dans la console : **Nouvel élément** > envoie le `.zip`
3. Remplis les onglets avec les textes de `store/LISTING.md`
4. Ajoute `icons/icon128.png`, `store/<langue>/promo-440x280.png` et les 5 captures de `store/screenshots/<langue>/`
5. Colle l'URL de la page de confidentialité
6. **Envoyer pour examen**

Conseil : pour la première version, choisis la visibilité **Non répertorié**. Tu partages le lien à quelques amis, puis tu passes en **Public** quand tout va bien.

L'examen prend en général de quelques jours à 2 semaines. Les extensions qui touchent à des données de santé et à deux sites tiers peuvent être examinées plus longtemps.

## 4. Mettre à jour plus tard

1. Augmente `"version"` dans `manifest.json` (ex. `1.0.1`)
2. `bash scripts/package.sh`
3. Console > ton extension > **Package > Importer un nouveau package**
4. Les utilisateurs reçoivent la mise à jour automatiquement

## Régénérer les fichiers

- Icônes et vignette : `uv run --no-project --with pillow python store/make_images.py`
- Page de confidentialité après modification de `PRIVACY.md` : `uv run --no-project --with markdown python store/make_privacy.py`

## Risques à connaître

- **Marques** : le nom cite Garmin et Claude pour dire avec quoi l'extension fonctionne, avec la mention « non affilié » dans la description. Si Google refuse ou si Garmin se plaint, renommer en `Mes Stats Montre` (voir `store/LISTING.md`) et renvoyer : pas de frais supplémentaires.
- **API non officielle** : Garmin peut modifier son site à tout moment. Si l'extension casse, il faudra relancer la sonde et adapter `collector.js`.
- **Interface de claude.ai** : si Anthropic change la zone de saisie, la pièce jointe automatique peut casser. Le bouton « Copier le texte » reste disponible en secours.
