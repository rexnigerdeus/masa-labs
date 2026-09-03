# Vitae — Site web

Pages web de l'application Vitae, à déployer sur `https://dailyco.influencemood.com/`.

## Structure de déploiement

| Fichier source | URL publique | Rôle |
|---|---|---|
| `index.html` | `https://dailyco.influencemood.com/vitae/` | Page marketing principale (App Store Marketing URL) |
| `support.html` | `https://dailyco.influencemood.com/vitae/support.html` | Page support (App Store Support URL) |
| `privacy.html` | `https://dailyco.influencemood.com/privacy.html` | Politique de confidentialité (App Store Privacy Policy URL) |
| `robots.txt` | `https://dailyco.influencemood.com/vitae/robots.txt` | SEO |
| `sitemap.xml` | `https://dailyco.influencemood.com/vitae/sitemap.xml` | SEO |
| `icon.png` (à copier depuis `web/favicon.png` ou `assets/images/app_icon_1024.png`) | `/vitae/icon.png` | Favicon |
| `og-image.png` (à générer depuis une capture du CV exemple) | `/vitae/og-image.png` | Open Graph |

## Comment déployer

### Option 1 — Vercel (recommandé)

1. Installer Vercel CLI : `npm i -g vercel`
2. À la racine de ce dossier, lancer : `vercel`
3. Suivre les instructions, lier au domaine `dailyco.influencemood.com`
4. Configurer un rewrites rule : `vitae/*` → `/$1` (déjà dans `vercel.json`)

### Option 2 — Hébergement actuel (manuel)

Si `dailyco.influencemood.com` est déjà hébergé quelque part, copier :

```bash
# Sur le serveur
mkdir -p /var/www/dailyco/vitae
cp vitae/site/*.html /var/www/dailyco/vitae/
cp vitae/site/robots.txt /var/www/dailyco/vitae/
cp vitae/site/sitemap.xml /var/www/dailyco/vitae/
cp vitae/web/favicon.png /var/www/dailyco/vitae/icon.png
# og-image à générer (capture d'un CV type ou bannière 1200×630)

# Privacy policy à la racine
cp vitae/site/privacy.html /var/www/dailyco/privacy.html
```

### Option 3 — Tout dans un sous-domaine

Si on veut `vitae.dailyco.influencemood.com` plus tard, il suffit de pointer ce dossier comme racine.

## URLs finales pour App Store Connect

| Champ | Valeur |
|---|---|
| **Marketing URL** | `https://dailyco.influencemood.com/vitae/` |
| **Support URL** | `https://dailyco.influencemood.com/vitae/support.html` |
| **Privacy Policy URL** | `https://dailyco.influencemood.com/privacy.html` |

## Avant la mise en ligne

Vérifier que :

- [ ] Le formulaire de contact fonctionne (configurer Formspree ID)
- [ ] `privacy@everyday.co` et `support@everyday.co` sont configurés
- [ ] Le favicon est bien dans `/vitae/icon.png`
- [ ] L'og-image (1200×630) est dans `/vitae/og-image.png`
- [ ] Les liens internes pointent vers les bonnes URLs
- [ ] Le domaine `dailyco.influencemood.com` accepte bien les requêtes HTTPS

## Personnalisation

Toutes les couleurs sont basées sur le design system de The Everyday Co. :
- **Steel blue** : `#3F6E91` (couleur principale Vitae)
- **Steel dark** : `#2C526E`
- **Steel light** : `#5B8AAE`
- **Background** : `#FAFAF7`
- **Text** : `#171411`
- **Yellow accent** : `#FDF150` (highlight, boutons highlight)

Pour modifier les couleurs, chercher et remplacer dans chaque fichier HTML.