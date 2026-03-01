# Installation de Multer pour l'upload de fichiers

## 📦 Dépendance requise

Pour activer la fonctionnalité d'upload de documents de preuve dans les demandes de rôle recruiter, vous devez installer **multer**.

## ⚙️ Installation

Dans le dossier **Back**, exécutez la commande suivante :

```bash
cd Back
npm install multer
```

## ✅ Fonctionnalités ajoutées

### Backend
- ✅ Modèle `RoleRequest` mis à jour avec le champ `proofDocument`
- ✅ Middleware `uploadMiddleware.js` créé pour gérer les uploads
- ✅ Route `/api/role-requests` modifiée pour accepter `multipart/form-data`
- ✅ Contrôleur `roleRequestController` mis à jour pour sauvegarder le fichier
- ✅ Route statique `/uploads` ajoutée pour servir les fichiers

### Frontend
- ✅ Formulaire de demande mis à jour avec input file
- ✅ Affichage du document dans "Mes demandes"
- ✅ Page admin `RoleRequests.tsx` mise à jour pour voir/télécharger le document

## 📁 Structure des fichiers uploadés

Les fichiers sont stockés dans :
```
Back/uploads/proof-documents/
```

Format du nom de fichier :
```
{userId}_{timestamp}_{randomNumber}_{originalName}.{ext}
```

## 🔒 Sécurité

- **Types de fichiers acceptés** : PDF, JPG, PNG, WEBP
- **Taille maximum** : 5 MB
- **Validation** : Le middleware vérifie le type MIME du fichier

## 🚀 Démarrage des serveurs

Après installation de multer :

### Backend
```bash
cd Back
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

## ✨ Utilisation

1. Le participant remplit le formulaire de demande recruiter
2. Il peut (optionnellement) uploader un document de preuve (carte enseignant, certificat, etc.)
3. Le document est sauvegardé sur le serveur
4. L'admin peut voir et télécharger le document depuis la page de validation des demandes
5. Le participant peut aussi voir son document uploadé dans "Mes demandes"

---

**Note** : Le champ document de preuve est **optionnel**. Les participants peuvent soumettre une demande sans document.
