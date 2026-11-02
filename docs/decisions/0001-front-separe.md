# 0001 - Séparer le front de l'API
Date : 2026-11-02 Statut : acceptée
## Contexte
Finder a une API Express et une interface à construire ; leurs outils et cycles de lancement diffèrent, il faut donc les développer séparément.
## Décision
Le front React/Vite est un projet autonome dans `front/`, à côté de `api/`, avec ses propres scripts npm.
## Alternatives écartées
- Servir l'interface depuis Express : cycles de développement couplés ; regrouper les deux projets : responsabilités et dépendances mélangées.
## Conséquences
Le front démarre séparément et communique avec l'API par HTTP ; il faut maintenir les deux projets et leurs origines de développement.
