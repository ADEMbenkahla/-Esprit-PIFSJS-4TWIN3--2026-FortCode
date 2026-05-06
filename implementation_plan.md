# Plan de Résolution DevOps : Kubernetes & Ngrok

Ce plan vise à corriger les erreurs de configuration dans les fichiers Kubernetes (YAML), à synchroniser les ports entre le code et l'infrastructure, et à assurer une communication fluide entre le Frontend, le Backend et la Base de Données via Ngrok.

## Problèmes Identifiés
*   **Backend** : Mismatch de port (5000 en code vs 3000 en YAML) et nom de variable d'environnement incorrect (`MONGODB_URI` au lieu de `MONGO_URI`).
*   **Base de Données** : Potentielle difficulté de connexion car le Backend n'utilise pas le bon nom de variable.
*   **Frontend** : Configuration statique de l'URL Ngrok qui nécessite un re-build après chaque changement d'URL.

## Étape 1 : Correction des Configurations Kubernetes [BACKEND]
Il faut aligner le déploiement Kubernetes avec la réalité du code source.

### [MODIFY] [backend-deploy.yaml](file:///c:/Users/rebai/Desktop/pi_v2/-Esprit-PIFSJS-4TWIN3--2026-FortCode/k8s/backend-deploy.yaml)
*   Changer `containerPort` à **5000**.
*   Changer `targetPort` à **5000**.
*   Renommer `MONGODB_URI` en **`MONGO_URI`**.
*   Ajouter le nom de la base de données à la fin de l'URL : `...:27017/fortcode`.
*   Passer le `Service` en type **NodePort** pour pouvoir l'exposer via Ngrok.

## Étape 2 : Préparation du Frontend [BUILD]
Le Frontend étant servi par Nginx, l'URL du backend doit être connue lors de la compilation.

### [MODIFY] [config.ts](file:///c:/Users/rebai/Desktop/pi_v2/-Esprit-PIFSJS-4TWIN3--2026-FortCode/frontend/src/config.ts)
*   S'assurer que `NGROK_URL` pointe vers l'adresse publique que vous allez donner au **Backend**.

### Re-build de l'Image
*   Lancer un nouveau build Docker pour le frontend afin d'intégrer la nouvelle URL.
*   Pousser l'image vers votre registre (Docker Hub ou autre).

## Étape 3 : Exposition via Ngrok
Pour un cluster `kubeadm`, Ngrok doit pointer vers les ports exposés par les services `NodePort`.

1.  **Récupérer les ports** : `kubectl get svc` (Chercher les ports entre 30000 et 32767).
2.  **Lancer Ngrok (Backend)** : `ngrok http <IP_DU_NODE>:<PORT_NODEPORT_BACK>`.
3.  **Lancer Ngrok (Frontend)** : `ngrok http <IP_DU_NODE>:<PORT_NODEPORT_FRONT>`.

## Étape 4 : Déploiement et Vérification
1.  Appliquer les changements : `kubectl apply -f k8s/`.
2.  Vérifier le statut des Pods : `kubectl get pods`.
3.  Consulter les logs du Backend : `kubectl logs -l app=backend`.
4.  Tester l'accès via l'URL Ngrok du Frontend.

## Questions Ouvertes
*   [!IMPORTANT]
    Utilisez-vous un **Ingress Controller** (comme Nginx Ingress) ou exposez-vous chaque service individuellement avec Ngrok ?
*   Le cluster `kubeadm` est-il sur votre machine locale ou sur un serveur distant ?
