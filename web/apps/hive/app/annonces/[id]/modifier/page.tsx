import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ListingForm } from '../../../../components/ListingForm';
import { getListing } from '../../../../lib/db/listings';
import { hiveProfile } from '../../../../lib/db/profile';
import { currentUser } from '../../../../lib/supabase/server';

export const metadata: Metadata = { title: 'Modifier l’annonce', robots: { index: false } };

export default async function ModifierAnnoncePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await currentUser();
  if (user === null) redirect(`/connexion?suite=/annonces/${id}/modifier`);

  const listing = await getListing(id);
  if (listing === null) notFound();

  // La RLS empêcherait l'écriture de toute façon ; on refuse ici pour ne pas
  // afficher un formulaire dont l'enregistrement échouerait à la fin.
  if (listing.user_id !== user.id) notFound();

  const profile = await hiveProfile(user.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link href={`/annonces/${id}`} className="text-sm text-muted underline">
          Retour à l’annonce
        </Link>
        <h1 className="text-2xl font-bold">Modifier l’annonce</h1>
      </div>
      <ListingForm userId={user.id} defaultCommune={profile.commune} listing={listing} />
    </div>
  );
}
