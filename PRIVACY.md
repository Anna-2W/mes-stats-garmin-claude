# Politique de confidentialité de Mes Stats Garmin pour Claude

_Dernière mise à jour : 6 octobre 2026 (version 1.0.1)_

Mes Stats Garmin pour Claude est une extension de navigateur qui permet d'ajouter tes données sportives Garmin Connect à une conversation Claude. Elle a été conçue pour ne rien collecter.

## Ce que fait l'extension

Quand tu cliques sur « Ajouter à la conversation » ou « Récupérer mes données », l'extension :

1. lit tes données depuis le site connect.garmin.com, en utilisant la session sur laquelle tu es déjà connecté·e dans ton navigateur ;
2. les met en forme dans un fichier texte, directement dans ton navigateur ;
3. joint ce fichier au message que tu es en train d'écrire sur claude.ai, ou te permet de le copier ou de le télécharger.

## Ce que l'extension ne fait pas

- Elle ne demande ni ne stocke ton identifiant ou ton mot de passe Garmin.
- Elle n'envoie aucune donnée à un serveur du développeur : il n'en existe pas.
- Elle ne stocke aucune donnée sportive ou de santé. La seule information conservée, dans ton navigateur uniquement, est **la date de ton dernier envoi** (par exemple « 2026-10-06 »), pour te proposer l'option « Depuis mon dernier envoi ». Elle disparaît si tu désinstalles l'extension.
- Elle ne contient aucun outil de mesure d'audience, de publicité ou de suivi.
- Elle ne vend ni ne partage aucune donnée avec qui que ce soit.

## Données traitées

Les données de santé et d'activité physique de ton compte Garmin Connect (activités, fréquence cardiaque, sommeil, HRV, stress, Body Battery, VO2 max, etc.) sont lues **uniquement à ta demande** et **uniquement dans ton navigateur**.

Elles ne sont transmises qu'à un seul endroit : la conversation claude.ai à laquelle **tu** choisis de les joindre. À partir de ce moment, elles sont traitées par Anthropic selon sa propre politique de confidentialité : <https://www.anthropic.com/legal/privacy>

## Autorisations demandées

| Autorisation | Pourquoi |
|---|---|
| Accès à connect.garmin.com | Lire tes données depuis ta session Garmin Connect |
| Script sur claude.ai | Afficher le bouton « ⌚ Garmin » et joindre le fichier à ton message |
| `scripting` | Exécuter la lecture des données dans l'onglet Garmin Connect |
| `storage` | Retenir la date de ton dernier envoi, et rien d'autre |

## Contact

Pour toute question ou pour signaler un problème : <https://github.com/Anna-2W/mes-stats-garmin-claude/issues>
