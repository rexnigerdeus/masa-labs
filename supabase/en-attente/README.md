# Migrations en attente

Migrations écrites mais **pas encore applicables** : elles dépendent d'une
mise en ligne d'application. Le CLI Supabase ne lit que `../migrations/` ;
rien d'ici ne part par erreur avec un `supabase db push`.

Pour en appliquer une, une fois sa condition remplie :

```bash
git mv supabase/en-attente/<fichier>.sql supabase/migrations/
npx supabase db push --dry-run --linked
npx supabase db push --linked
```

| Fichier | Condition |
| --- | --- |
| `20261002150100_profiles_telephone_prive.sql` | Hive (web) déployé en production avec la lecture des numéros par `hive_telephones_commandes`, **et** Rondo (Flutter) publié avec `rondo_telephones`. Sinon : `permission denied for column phone` sur /compte et /mes-commandes de Hive, et sur la liste des membres de Rondo. |
