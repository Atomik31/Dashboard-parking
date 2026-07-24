# Mon super Dashboard 2 

test du template 

## 🚀 Installation

```bash
# Cloner ou télécharger le projet
cd test_dashboard

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'application
streamlit run main.py
```

## 📁 Structure du projet

```
test_dashboard/
├── main.py                    # Point d'entrée de l'application
├── requirements.txt           # Dépendances Python
├── .streamlit/
│   └── config.toml           # Configuration Streamlit
├── src/
│   └── test_dashboard/
│       ├── pages/            # Pages de l'application
│       ├── components/       # Composants réutilisables
│       └── utils/           # Fonctions utilitaires
└── data/
    └── sample_data.csv      # Données d'exemple
```

## 🎯 Fonctionnalités

- ✅ Structure modulaire et professionnelle
- ✅ Pages multiples avec navigation
- ✅ Composants réutilisables
- ✅ Configuration Streamlit optimisée
- ✅ Données d'exemple incluses
- ✅ Dashboard d'analytics de démonstration

## 🎨 Personnalisation

### Thème
Le thème par défaut est configuré sur `light`. 
Vous pouvez le modifier dans `.streamlit/config.toml`.

### Pages
Ajoutez de nouvelles pages dans `src/test_dashboard/pages/`.
Le nommage `{numero}_{emoji}_{nom}.py` permet un tri automatique.

### Composants
Créez des composants réutilisables dans `src/test_dashboard/components/`.

## 🐍 Versions supportées

- Python 3.12+
- Streamlit 1.28.0+

## 👨‍💻 Développé par

**JC** - j.chr@gmail.com

## 📚 Aller plus loin

Ce template démo vous donne un aperçu des bonnes pratiques Streamlit.

🎓 **Envie d'une version complète ?**
- Tests automatisés
- CI/CD avec GitHub Actions  
- Déploiement cloud
- Gestion avancée des états
- Authentification utilisateur
- Base de données intégrée
- Monitoring et analytics
- Documentation automatique

👉 **[Découvrez notre formation Streamlit avancée](https://votre-lien-formation.com)**

---

⭐ Si ce template vous a aidé, n'hésitez pas à lui donner une étoile !