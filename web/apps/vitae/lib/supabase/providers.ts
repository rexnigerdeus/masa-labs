/**
 * Providers d'authentification réellement activés sur le projet.
 *
 * Google est déclaré dans le code mais éteint côté Supabase : afficher un
 * bouton qui renverrait une erreur serait pire que ne pas l'afficher. On
 * interroge donc la configuration du serveur d'auth, et le bouton apparaît
 * de lui-même le jour où le provider est activé dans le dashboard.
 */
interface AuthSettings {
  external?: Record<string, boolean>;
}

export async function isGoogleEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url === undefined || key === undefined) return false;

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      // La configuration change rarement : une heure de cache suffit à ne pas
      // ajouter un aller-retour à chaque affichage de la page de connexion.
      next: { revalidate: 3600 },
    });
    if (!response.ok) return false;
    const settings = (await response.json()) as AuthSettings;
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
