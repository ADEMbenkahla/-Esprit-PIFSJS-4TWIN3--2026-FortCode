# Intégration Double Modèle ML - FortCode Battle System

## 🎯 **Objectif**

Intégrer deux modèles ML distincts pour le système de bataille :
1. **Modèle Détection AI/Plagiat** (port 5050) - Service existant
2. **Modèle Prédiction Complexité** (port 5002) - Nouveau service

## 📁 **Architecture des Services**

### Service 1: ML Detection (Existant)
- **Port**: 5050
- **Dossier**: `ml-service-python/`
- **Rôle**: Déterminer si le code est Humain/AI/Plagiat
- **Endpoint**: `POST /predict`

### Service 2: Complexité Prediction (Nouveau)
- **Port**: 5002
- **Dossier**: `complexity-service/`
- **Rôle**: Prédire la complexité temporelle du code
- **Endpoint**: `POST /predict`

## 🏆 **Logique de Détermination du Gagnant**

### Règles de Priorité
1. **Détection AI/Plagiat** = Défaite automatique
   - Si un joueur est détecté comme "IA" ou "Plagiat" → PERDU
   - Si les deux sont IA/Plagiat → ÉGALITÉ

2. **Comparaison Complexité** (uniquement si Humain vs Humain)
   - Scores de complexité : O(1)=6pts, O(log n)=5pts, O(n)=4pts, O(n log n)=3pts, O(n²)=2pts, O(2^n)=1pt
   - Score plus élevé = GAGNE

3. **Temps de Soumission** (égalité de complexité)
   - Soumission plus rapide = GAGNE

4. **Confiance AI** (égalité complète)
   - Confiance plus élevée = GAGNE

5. **Points de Vie** (dernier tie-breaker)
   - Vie restante plus élevée = GAGNE

6. **ÉGALITÉ** si tout est égal

## 🚀 **Démarrage Rapide**

### Option 1: Script Automatique
```bash
python start_dual_ml_services.py
```

### Option 2: Manuel
```bash
# Terminal 1 - Service ML Detection
cd ml-service-python
pip install -r requirements.txt
python api.py

# Terminal 2 - Service Complexité  
cd ../complexity-service
pip install -r requirements.txt
python app.py
```

## 📊 **Scoring de Complexité**

| Complexité | Points | Couleur UI | Description |
|------------|---------|-------------|-------------|
| O(1) | 6 pts | 🟢 Vert | Optimal |
| O(log n) | 5 pts | 🟢 Vert | Efficace |
| O(n) | 4 pts | 🟡 Jaune | Linéaire |
| O(n log n) | 3 pts | 🟡 Jaune | Moyen |
| O(n²) | 2 pts | 🔴 Rouge | Quadratique |
| O(2^n) | 1 pt | 🔴 Rouge | Exponentiel |

## 🔧 **Configuration Backend**

### Variables d'Environnement
```bash
ML_DETECTION_URL=http://localhost:5050
COMPLEXITY_SERVICE_URL=http://localhost:5002
```

### Services Intégrés
- `complexityService.js` - Service unifié pour les deux modèles
- Mise à jour des contrôleurs pour utiliser les deux analyses
- Logique de comparaison avec tie-breakers multiples

## 🎮 **Intégration 1v1 (Random & Ranked)**

### Socket.io Updates
- Analyse du code avec les deux modèles lors de la soumission
- Résolution des matchs avec logique de complexité prioritaire
- Support des tie-breakers automatiques

### Frontend Updates
- Affichage de la complexité dans les résultats de bataille
- Coloration selon le score de complexité
- Affichage de la confiance AI

## 🛠️ **Dépannage**

### Vérification Services
```bash
# Vérifier ML Detection
curl http://localhost:5050/health

# Vérifier Complexité
curl http://localhost:5002/health
```

### Logs
- ML Detection: Logs sur port 5050
- Complexité: Logs sur port 5002
- Backend: Logs d'intégration unifiée

### Erreurs Communes
1. **Port 5050 déjà utilisé** → Changer le port dans `ml-service-python/api.py`
2. **Port 5002 déjà utilisé** → Changer le port dans `complexity-service/app.py`
3. **Modèle non trouvé** → Vérifier que `complexity_classifier.pkl` existe dans `complexity-service/`
4. **Timeout** → Augmenter les timeouts dans les appels API

## 📈 **Monitoring**

### Métriques
- Temps de réponse moyen par service
- Taux de succès/échec des prédictions
- Distribution des complexités prédites
- Nombre de détections AI/Plagiat

### Alertes
- Service indisponible > 30 secondes
- Taux d'erreur > 10%
- Temps de réponse > 5 secondes

## 🔄 **Fallback Logic**

### Si Service ML Detection échoue
- Continue avec complexité uniquement
- Pas de détection AI/Plagiat

### Si Service Complexité échoue
- Continue avec temps de soumission uniquement
- Score de complexité = 0 pour tous

### Si les deux services échouent
- Logique de base (temps de soumission seulement)
- Notification d'erreur aux recruteurs

## ✅ **Tests de Validation**

### Test 1: Complexité O(1)
```javascript
function getFirst(arr) { return arr[0]; }
```
**Attendu**: Complexité O(1), Score 6

### Test 2: Complexité O(n)
```javascript
function linearSearch(arr, target) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) return i;
    }
    return -1;
}
```
**Attendu**: Complexité O(n), Score 4

### Test 3: Complexité O(n²)
```javascript
function bubbleSort(arr) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}
```
**Attendu**: Complexité O(n²), Score 2

## 🎯 **Cas d'Usage**

### Cas 1: Humain vs Humain
1. Les deux soumissions sont analysées
2. Si scores de complexité différents → plus élevé gagne
3. Si égal → temps de soumission départage
4. Si encore égal → confiance AI départage
5. Si encore égal → vie restante départage
6. Si encore égal → draw

### Cas 2: Humain vs AI/Plagiat
1. Joueur AI/Plagiat perd automatiquement
2. Joueur humain gagne par forfait

### Cas 3: AI/Plagiat vs AI/Plagiat
1. Les deux perdent automatiquement
2. Résultat: draw

## 📱 **UI/UX Improvements**

### Affichage Complexité
- Badge de complexité avec couleur
- Score numérique (1-6) visible
- Confiance AI en pourcentage
- Tooltip avec explication

### Résultats de Bataille
- Gagnant clairement mis en évidence
- Classement avec complexité de chaque participant
- Historique des prédictions

## 🔐 **Sécurité**

### Validation Entrée
- Taille maximale du code: 10KB
- Timeout des analyses: 10 secondes
- Rate limiting: 10 requêtes/minute

### Sanitization
- Suppression des commentaires pour analyse
- Échappement des caractères spéciaux
- Validation syntaxique basique

---

## 🎮 **Instructions Finales**

1. **Démarrer les services**:
   ```bash
   python start_dual_ml_services.py
   ```

2. **Démarrer le backend**:
   ```bash
   cd Back
   npm start
   ```

3. **Démarrer le frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Tester l'intégration**:
   - Créer une bataille 1v1
   - Soumettre du code avec différentes complexités
   - Vérifier la détermination du gagnant
   - Valider les tie-breakers

**Système prêt pour utilisation avec double modèle ML!** 🚀
