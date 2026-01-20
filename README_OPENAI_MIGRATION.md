# Migration OpenAI vers le Backend

## Résumé des changements

La clé API OpenAI a été déplacée du frontend vers le backend pour des raisons de sécurité.

## Changements effectués

### Backend
1. **Nouveau contrôleur OpenAI** : `src/infrastructure/controllers/openaiController.ts`
   - `searchCompanyLogo()` : Recherche de logo d'entreprise
   - `generateCompanyProfile()` : Génération de profil d'entreprise
   - `generateUniquenessCategories()` : Génération de catégories d'unicité

2. **Nouvelles routes** : `src/infrastructure/routes/openaiRoutes.ts`
   - `POST /api/openai/search-logo`
   - `POST /api/openai/generate-profile` 
   - `POST /api/openai/generate-uniqueness`

3. **Intégration dans l'application** : `src/index.ts`
   - Ajout des routes OpenAI

### Frontend
1. **Nouveau module API** : `src/api/openaiBackend.ts`
   - Remplace `src/api/openai.ts` (supprimé)
   - Effectue des appels vers le backend au lieu d'OpenAI directement

2. **Mise à jour des imports** :
   - `App.tsx`
   - `components/CompanyProfile.tsx`
   - `components/UniquenessPanel.tsx`
   - `components/DifferentiatorsPanel.tsx`

3. **Suppression de la clé API** :
   - Suppression de `VITE_OPENAI_API_KEY` du Dockerfile
   - Suppression du fichier `src/api/openai.ts`

## Configuration requise

### Backend
Ajoutez dans votre fichier `.env` :
```
OPENAI_API_KEY=votre_cle_api_openai
```

### Frontend
Aucune configuration OpenAI requise - les appels passent par le backend.

## Installation

### Backend
```bash
cd v25_searchcompanywizard_backend
npm install openai
```

### Frontend
Aucune installation supplémentaire requise.

## Avantages de cette migration

1. **Sécurité** : La clé API n'est plus exposée côté client
2. **Contrôle** : Meilleur contrôle des appels API depuis le serveur
3. **Monitoring** : Possibilité de logger et monitorer les appels
4. **Cache** : Possibilité d'ajouter du cache côté serveur
5. **Rate limiting** : Contrôle des limites d'utilisation

## Test

Pour tester la migration :
1. Démarrez le backend avec la clé OpenAI configurée
2. Démarrez le frontend
3. Testez la recherche d'entreprise et la génération de profil
