# Rondo — Site web

Pages web de l'application Rondo, à déployer sur `https://dailyco.influencemood.com/`.

## Structure de déploiement

| Fichier source | URL publique | Rôle |
|---|---|---|
| `index.html` | `https://dailyco.influencemood.com/rondo/` | Page marketing principale (App Store Marketing URL) |
| `support.html` | `https://dailyco.influencemood.com/rondo/support.html` | Page support (App Store Support URL) |
| `privacy.html` | `https://dailyco.influencemood.com/privacy.html` | Politique de confidentialité (App Store Privacy Policy URL) |
| `robots.txt` | `https://dailyco.influencemood.com/rondo/robots.txt` | SEO |
| `sitemap.xml` | `https://dailyco.influencemood.com/rondo/sitemap.xml` | SEO |
| `icon.png` (à copier depuis `assets/images/app_icon_1024.png`) | `/rondo/icon.png` | Favicon |

## Comment déployer

### Option 1 — Vercel (recommandé)

1. Installer Vercel CLI : `npm i -g vercel`
2. À la racine de ce dossier, lancer : `vercel`
3. Suivre les instructions, lier au domaine `dailyco.influencemood.com`
4. Configurer un rewrites rule : `rondo/*` → `/$1` (déjà dans `vercel.json`)

### Option 2 — Hébergement actuel (manuel)

Si `dailyco.influencemood.com` est déjà hébergé quelque part, copier :

```bash
# Sur le serveur
mkdir -p /var/www/dailyco/rondo
cp rondo/site/*.html /var/www/dailyco/rondo/
cp rondo/site/robots.txt /var/www/dailyco/rondo/
cp rondo/site/sitemap.xml /var/www/dailyco/rondo/
cp rondo/assets/images/app_icon_1024.png /var/www/dailyco/rondo/icon.png
cp rondo/assets/images/splash_full.png /var/www/dailyco/rondo/og-image.png

# Privacy policy à la racine
cp rondo/site/privacy.html /var/www/dailyco/privacy.html
```

### Option 3 — Tout dans un sous-domaine

Si on veut `rondo.dailyco.influencemood.com` plus tard, il suffit de pointer ce dossier comme racine.

## URLs finales pour App Store Connect

| Champ | Valeur |
|---|---|
| **Marketing URL** | `https://dailyco.influencemood.com/rondo/` |
| **Support URL** | `https://dailyco.influencemood.com/rondo/support.html` |
| **Privacy Policy URL** | `https://dailyco.influencemood.com/privacy.html` |

## Avant la mise en ligne

Vérifier que :

- [ ] Le formulaire de contact fonctionne (configurer Formspree ID)
- [ ] `privacy@everyday.co` et `support@everyday.co` sont configurés
- [ ] Le favicon est bien dans `/rondo/icon.png`
- [ ] Les liens internes pointent vers les bonnes URLs
- [ ] Le domaine `dailyco.influencemood.com` accepte bien les requêtes HTTPS

## Personnalisation

Toutes les couleurs sont basées sur le design system de The Everyday Co. :
- **Copper** : `#B8703A` (couleur principale Rondo)
- **Copper light** : `#E89856`
- **Copper dark** : `#9B5A2B`
- **Background** : `#FAFAF7`
- **Text** : `#171411`

Pour modifier les couleurs, chercher et remplacer dans chaque fichier HTML.
