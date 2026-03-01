# Fonctionnalité : Demande de Rôle Recruiter et Salles de Programmation

## Vue d'ensemble

Cette fonctionnalité permet aux participants de demander le rôle de "recruiter", aux admins de gérer ces demandes, et aux recruiters de créer des salles de programmation collaboratives.

## Architecture

### Backend

#### Modèles MongoDB

1. **RoleRequest** (`/Back/src/models/RoleRequest.js`)
   - Gère les demandes de rôle recruiter
   - Champs : userId, requestedRole, justification, status, reviewedBy, reviewedAt, adminComment
   - Status : pending, approved, rejected

2. **ProgrammingRoom** (`/Back/src/models/ProgrammingRoom.js`)
   - Gère les salles de programmation
   - Champs : name, description, creatorId, language, difficulty, maxParticipants, currentParticipants, duration, isPublic, status, scheduledAt, roomCode
   - Status : waiting, active, completed, cancelled

#### Contrôleurs

1. **roleRequestController.js**
   - `createRoleRequest` - Créer une demande (participant)
   - `getMyRoleRequests` - Voir mes demandes (participant)
   - `getAllRoleRequests` - Voir toutes les demandes (admin)
   - `approveRoleRequest` - Approuver une demande (admin)
   - `rejectRoleRequest` - Rejeter une demande (admin)
   - `deleteRoleRequest` - Supprimer une demande (user/admin)

2. **programmingRoomController.js**
   - `createRoom` - Créer une salle (recruiter/admin)
   - `getAllRooms` - Lister toutes les salles (tous)
   - `getRoomById` - Détails d'une salle (tous)
   - `joinRoom` - Rejoindre une salle (tous)
   - `leaveRoom` - Quitter une salle (tous)
   - `startRoom` - Démarrer une salle (créateur)
   - `completeRoom` - Terminer une salle (créateur)
   - `deleteRoom` - Supprimer une salle (créateur/admin)

#### Routes

1. **roleRequestRoutes.js**
   - `POST /api/role-requests` - Créer une demande
   - `GET /api/role-requests/my-requests` - Mes demandes
   - `GET /api/role-requests` - Toutes les demandes (admin)
   - `PUT /api/role-requests/:requestId/approve` - Approuver (admin)
   - `PUT /api/role-requests/:requestId/reject` - Rejeter (admin)
   - `DELETE /api/role-requests/:requestId` - Supprimer

2. **programmingRoomRoutes.js**
   - `GET /api/programming-rooms` - Lister
   - `POST /api/programming-rooms` - Créer (recruiter/admin)
   - `GET /api/programming-rooms/:roomId` - Détails
   - `POST /api/programming-rooms/:roomId/join` - Rejoindre
   - `POST /api/programming-rooms/:roomId/leave` - Quitter
   - `PUT /api/programming-rooms/:roomId/start` - Démarrer (recruiter/admin)
   - `PUT /api/programming-rooms/:roomId/complete` - Terminer (recruiter/admin)
   - `DELETE /api/programming-rooms/:roomId` - Supprimer

#### Middleware

**roleMiddleware.js** - Mis à jour pour supporter plusieurs rôles
```javascript
roleMiddleware("admin") // un seul rôle
roleMiddleware("recruiter", "admin") // plusieurs rôles
```

### Frontend

#### Pages

1. **RequestRecruiterRole.jsx** (`/frontend/src/pages/frontOffice/pages/`)
   - Interface pour les participants
   - Formulaire de demande avec justification (20-500 caractères)
   - Liste des demandes personnelles avec statut
   - Affichage des commentaires admin

2. **RoleRequests.tsx** (`/frontend/src/pages/backOffice/`)
   - Interface pour les admins
   - Vue de toutes les demandes avec filtres (pending, approved, rejected)
   - Formulaire pour approuver/rejeter avec commentaire
   - Informations détaillées sur les demandeurs

3. **CreateProgrammingRoom.jsx** (`/frontend/src/pages/frontOffice/pages/`)
   - Interface pour les recruiters
   - Formulaire de création de salle
   - Configuration : langage, difficulté, nombre de participants, durée
   - Options : public/privé, planification

#### Navigation

**Navbar.jsx** - Mise à jour avec liens conditionnels :
- Participants : bouton "Devenir Recruiter"
- Recruiters : bouton "Créer une Salle"

**Sidebar.tsx** (BackOffice) - Ajout du lien :
- Admin uniquement : "Role Requests"

#### Routes (App.jsx)

```javascript
// Front Office
/request-recruiter - Demander le rôle recruiter
/create-room - Créer une salle de programmation

// Back Office
/backoffice/role-requests - Gérer les demandes (admin)
```

## Flux de travail

### 1. Demande de Rôle Recruiter

1. **Participant** accède à `/request-recruiter`
2. Remplit le formulaire avec une justification (ex: "Je suis enseignant...")
3. Soumet la demande → Status: `pending`
4. **Admin** voit la demande dans `/backoffice/role-requests`
5. Admin examine la justification
6. Admin approuve ou rejette avec commentaire optionnel
7. Si approuvé → Role de l'utilisateur change à `recruiter`
8. **Participant** reçoit la notification (via status de la demande)

### 2. Création de Salle de Programmation

1. **Recruiter** accède à `/create-room` (bouton visible dans navbar)
2. Configure la salle :
   - Nom et description
   - Langage (JavaScript, Python, Java, etc.)
   - Difficulté (Débutant, Intermédiaire, Avancé, Expert)
   - Nombre max de participants (2-50)
   - Durée (15-240 minutes)
   - Public/Privé
   - Date/heure planifiée (optionnel)
3. Soumet → Salle créée avec code unique
4. Participants peuvent rejoindre la salle
5. Recruiter démarre la session
6. Après la session, recruiter marque comme complétée

## API Examples

### Créer une demande de rôle

```javascript
POST /api/role-requests
Authorization: Bearer <token>

{
  "justification": "Je suis enseignant en informatique avec 5 ans d'expérience..."
}
```

### Approuver une demande (Admin)

```javascript
PUT /api/role-requests/:requestId/approve
Authorization: Bearer <token>

{
  "adminComment": "Profil validé, bienvenue en tant que recruiter!"
}
```

### Créer une salle de programmation (Recruiter)

```javascript
POST /api/programming-rooms
Authorization: Bearer <token>

{
  "name": "Session JavaScript Avancé",
  "description": "Programmation fonctionnelle et asynchrone",
  "language": "javascript",
  "difficulty": "advanced",
  "maxParticipants": 20,
  "duration": 90,
  "isPublic": true,
  "scheduledAt": "2024-03-15T14:00:00Z"
}
```

### Rejoindre une salle

```javascript
POST /api/programming-rooms/:roomId/join
Authorization: Bearer <token>
```

## Sécurité et Permissions

### Rôles
- **participant** : Peut demander le rôle recruiter, rejoindre des salles
- **recruiter** : Peut créer et gérer des salles, tout ce qu'un participant peut faire
- **admin** : Peut approuver/rejeter les demandes, accès complet

### Validations
- Justification : 20-500 caractères
- Un seul rôle pending par utilisateur
- Seul le créateur peut démarrer/terminer une salle
- Les salles actives ne peuvent pas être supprimées
- Limite de participants respectée

## Tests recommandés

1. **Test Participant**
   - Créer une demande de rôle recruiter
   - Vérifier qu'on ne peut pas créer plusieurs demandes pending
   - Supprimer une demande pending ou rejetée

2. **Test Admin**
   - Voir toutes les demandes
   - Filtrer par status
   - Approuver une demande → vérifier changement de rôle
   - Rejeter avec commentaire

3. **Test Recruiter**
   - Créer une salle de programmation
   - Démarrer une session
   - Gérer les participants
   - Terminer une session

4. **Test Intégration**
   - Navigation conditionnelle basée sur le rôle
   - Permissions API respectées
   - Messages d'erreur appropriés

## Améliorations futures possibles

1. **Notifications en temps réel** (Socket.io)
   - Notifier les participants quand leur demande est traitée
   - Alertes quand une nouvelle salle est créée

2. **Système de notation**
   - Les participants notent les sessions
   - Statistiques pour les recruiters

3. **Chat intégré**
   - Communication dans les salles de programmation

4. **Éditeur de code collaboratif**
   - Monaco Editor ou CodeMirror
   - Synchronisation en temps réel

5. **Enregistrement des sessions**
   - Replay des sessions passées
   - Analyse de code

6. **Badges et récompenses**
   - Badges pour les recruiters actifs
   - Points pour la participation

## Déploiement

### Dépendances ajoutées
Aucune nouvelle dépendance npm requise - utilise les packages existants.

### Migration de base de données
Les nouveaux modèles MongoDB seront créés automatiquement :
- `rolequests` collection
- `programmingrooms` collection

### Variables d'environnement
Aucune nouvelle variable requise.

## Support

Pour toute question ou problème :
1. Vérifier les logs serveur
2. Inspecter la console du navigateur
3. Vérifier les permissions utilisateur
4. Valider le token JWT

---

**Version**: 1.0.0  
**Date**: Février 2024  
**Auteur**: FortCode Team
