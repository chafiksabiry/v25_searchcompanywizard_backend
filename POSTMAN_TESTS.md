# Tests Postman pour les Routes OpenAI

## Configuration de base

**Base URL** : `http://localhost:5001/api/openai`

⚠️ **Important** : Assurez-vous que votre backend est démarré et que `OPENAI_API_KEY` est configurée dans votre `.env`

## 1. 🔍 Test de Recherche de Logo

### Endpoint
```
POST /api/openai/search-logo
```

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "companyName": "Microsoft",
  "companyWebsite": "https://www.microsoft.com"
}
```

### Réponse attendue
```json
{
  "success": true,
  "data": {
    "logoUrl": "https://logo.clearbit.com/microsoft.com"
  }
}
```

---

## 2. 🏢 Test de Génération de Profil d'Entreprise

### Endpoint
```
POST /api/openai/generate-profile
```

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "companyInfo": "Company Name: Microsoft\nWebsite: https://www.microsoft.com\nDescription: Microsoft Corporation is an American multinational technology corporation headquartered in Redmond, Washington. Microsoft's best-known software products are the Windows line of operating systems, the Microsoft Office suite, and the Internet Explorer and Edge web browsers.",
  "userId": "681a91212c1ca099fe2b17df"
}
```

### Réponse attendue
```json
{
  "success": true,
  "data": {
    "userId": "681a91212c1ca099fe2b17df",
    "name": "Microsoft Corporation",
    "industry": "Technology",
    "founded": "1975",
    "headquarters": "Redmond, Washington, USA",
    "overview": "Microsoft Corporation is a leading multinational technology company...",
    "mission": "To empower every person and every organization on the planet to achieve more.",
    "companyIntro": "Partner with Microsoft, a global technology leader driving innovation...",
    "culture": {
      "values": ["Respect", "Integrity", "Accountability"],
      "benefits": ["Health Insurance", "Flexible Work", "Professional Development"],
      "workEnvironment": "Collaborative and inclusive environment..."
    },
    "opportunities": {
      "roles": ["Software Engineer", "Product Manager", "Data Scientist"],
      "growthPotential": "Extensive career advancement opportunities...",
      "training": "Comprehensive training and certification programs..."
    },
    "technology": {
      "stack": ["Azure", "C#", ".NET", "TypeScript"],
      "innovation": "Leading in cloud computing and AI technologies..."
    },
    "contact": {
      "website": "https://www.microsoft.com",
      "email": "info@microsoft.com",
      "phone": "+1-425-882-8080",
      "address": "One Microsoft Way, Redmond, WA 98052"
    },
    "socialMedia": {
      "linkedin": "https://www.linkedin.com/company/microsoft",
      "twitter": "https://twitter.com/Microsoft",
      "facebook": "https://www.facebook.com/Microsoft",
      "instagram": "https://www.instagram.com/microsoft"
    }
  }
}
```

---

## 3. ⭐ Test de Génération de Catégories d'Unicité

### Endpoint
```
POST /api/openai/generate-uniqueness
```

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "profile": {
    "name": "Microsoft Corporation",
    "industry": "Technology",
    "mission": "To empower every person and every organization on the planet to achieve more.",
    "overview": "Microsoft Corporation is a leading multinational technology company that develops, manufactures, licenses, supports, and sells computer software, consumer electronics, personal computers, and related services.",
    "culture": {
      "values": ["Respect", "Integrity", "Accountability"],
      "benefits": ["Health Insurance", "Flexible Work", "Professional Development"]
    },
    "opportunities": {
      "roles": ["Software Engineer", "Product Manager", "Data Scientist"]
    }
  }
}
```

### Réponse attendue
```json
{
  "success": true,
  "data": [
    {
      "title": "Global Technology Leadership",
      "icon": "Rocket",
      "description": "Leading innovation in cloud computing and AI",
      "score": 5,
      "details": [
        "Azure cloud platform with 95% uptime",
        "AI-powered solutions across all products",
        "Continuous investment in R&D"
      ]
    },
    {
      "title": "Career Growth Opportunities",
      "icon": "TrendingUp",
      "description": "Extensive professional development programs",
      "score": 4,
      "details": [
        "Internal mobility programs",
        "Leadership development tracks",
        "Mentorship opportunities"
      ]
    }
  ]
}
```

---

## 🚨 Gestion des Erreurs

### Erreur de clé API manquante
```json
{
  "success": false,
  "message": "OpenAI API key is not configured"
}
```

### Erreur de paramètres manquants
```json
{
  "success": false,
  "message": "Company information is required"
}
```

### Erreur OpenAI (quota dépassé, etc.)
```json
{
  "success": false,
  "message": "OpenAI API Error",
  "error": "Rate limit exceeded"
}
```

---

## 📋 Collection Postman

Vous pouvez créer une collection Postman avec ces 3 requêtes :

1. **Logo Search** - POST `{{baseUrl}}/search-logo`
2. **Generate Profile** - POST `{{baseUrl}}/generate-profile`  
3. **Generate Uniqueness** - POST `{{baseUrl}}/generate-uniqueness`

### Variables d'environnement
```
baseUrl = http://localhost:5001/api/openai
```

---

## 🔧 Dépannage

### Le serveur ne répond pas
- Vérifiez que le backend est démarré : `npm run dev`
- Vérifiez le port : par défaut 5001
- Vérifiez les logs du serveur

### Erreur 500
- Vérifiez que `OPENAI_API_KEY` est dans votre `.env`
- Vérifiez que la clé API est valide
- Vérifiez les logs du serveur pour plus de détails

### Timeout
- Les appels OpenAI peuvent prendre 10-30 secondes
- Augmentez le timeout de Postman si nécessaire
