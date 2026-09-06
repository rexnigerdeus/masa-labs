import { createClient } from '../supabase/server';

/** Profil Hive : commune par défaut et modes de paiement acceptés. */
export type HiveProfile = {
  user_id: string;
  commune: string | null;
  bio: string | null;
  accepts_cash: boolean;
  accepts_online: boolean;
};

/**
 * Profil Hive d'un utilisateur, ou des valeurs par défaut.
 *
 * La ligne n'existe qu'une fois le compte complété : quelqu'un qui s'inscrit
 * et publie dans la foulée n'a encore rien renseigné, et ce n'est pas une
 * raison pour lui refuser une annonce. Le main propre est le socle, il
 * fonctionne sans rien configurer.
 */
export async function hiveProfile(userId: string): Promise<HiveProfile> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return (data as HiveProfile | null)
    ?? { user_id: userId, commune: null, bio: null, accepts_cash: true, accepts_online: false };
}

/** Nom et téléphone communs, partagés avec les autres applications de la base. */
export async function baseProfile(
  userId: string,
): Promise<{ full_name: string | null; phone: string | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', userId)
    .maybeSingle();
  return (data as { full_name: string | null; phone: string | null } | null) ?? null;
}
