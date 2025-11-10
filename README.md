# TransformationImages
# SCRUM Project – Webservice de Transformation d’Images

## Description du projet
Ce projet s’inscrit dans le cadre du **TP Processus de Développement Logiciel** et a été développé selon la **méthodologie Scrum**.  
L’objectif est de concevoir un **webservice de transformation d’images** permettant d’effectuer des opérations simples comme :

- Rotation d’une image (90°, 180°, 270°)
- Conversion en noir & blanc ou en niveaux de gris
- Inversion horizontale ou verticale
- Redimensionnement
- Encodage en Base64

Le projet est prévu pour être implémenté en **Java Spring Boot**, mais le **Sprint 1** s’est concentré sur la **conception et la réalisation de l’interface web** du service.


## Objectif du Sprint 1
Mettre en place une première version du site web de présentation du webservice, avec une page d’accueil et un logo interactif qui pivote grâce à un curseur.

---

## Architecture prévue

Le projet suit une architecture en couches inspirée du modèle MVC :
![alt text](<ChatGPT Image 10 nov. 2025, 09_12_22.png>)


Le front-end actuel servira d’interface au backend Spring Boot, qui sera développé à partir du Sprint 2.

---

## Structure du projet
Projet_WebService/
├── index.html → Page d’accueil (About)
├── upload.html → Page d’upload d’image (à implémenter)
├── A_logo_features_a_white_line_art_design_set_agains.png → Logo du projet
└── README.md → Documentation du projet

---

## Équipe Scrum
| Rôle | Nom | Responsabilités |
|------|-----|-----------------|
| **Product Owner** | [le prof] | Gestion du backlog, priorisation des fonctionnalités |
| **Scrum Master** | [Melissa] | Animation des réunions, suivi du sprint |
| **Développeurs** | [Hadjira, Chahira, Kawther, Mélissa] | Conception, développement, tests et documentation |
