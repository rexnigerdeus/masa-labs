import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ListingForm } from '../../components/ListingForm';
import { currentUser } from '../../lib/supabase/server';
import { hiveProfile } from '../../lib/db/profile';

export const metadata: Metadata = { title: 'Publier une annonce — Hive' };

export default async function PublierPage() {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/publier');

  // La commune du profil pré-remplit le formulaire : la plupart des gens
  // louent depuis chez eux, et c'est un champ de moins à remplir.
  const profile = await hiveProfile(user.id);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Publier une annonce</h1>
      <ListingForm userId={user.id} defaultCommune={profile.commune} />
    </div>
  );
}
