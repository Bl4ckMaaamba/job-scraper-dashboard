#!/bin/bash

echo "🚀 Déploiement Job Scraper Dashboard sur Railway"
echo "================================================"

# Vérifier que nous sommes dans le bon dossier
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le dossier Version_Client"
    exit 1
fi

# Vérifier que Railway CLI est installé
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI n'est pas installé. Installez-le avec: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Vérifications préliminaires..."

# Build de test
echo "🔨 Test du build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build. Corrigez les erreurs avant de continuer."
    exit 1
fi

echo "✅ Build réussi !"

# Commit des changements
echo "📝 Commit des changements..."
git add .
git commit -m "🚀 Deploy: Ready for Railway production" --no-verify

# Déploiement Railway
echo "🚄 Déploiement sur Railway..."
echo "Note: Suivez les instructions dans le navigateur pour l'authentification"

railway up

echo "🎉 Déploiement terminé !"
echo "Votre application devrait être accessible sur Railway."
echo "Utilisez 'railway status' pour vérifier le statut."
echo "Utilisez 'railway logs' pour voir les logs." 