-- ============================================================
-- Retrait de Groot Habits
--
-- L'app Flutter Groot Habits est abandonnée au profit de Sowly (Graines
-- d'Habitudes), une PWA repartie d'une vision nouvelle : plus de mascotte,
-- un module de tâches en plus du tracker. Le schéma `groot_` portait la
-- mascotte jusque dans ses colonnes (`mascot_stage`, `decorations`, badges
-- qui débloquent un décor) ; Sowly ne le réutilise pas, il a ses propres
-- tables `sowly_` (migration suivante).
--
-- Groot ne modifiait aucun objet partagé : il lisait `public.profiles` et
-- `public.update_updated_at()` sans les toucher, n'avait ni fonction, ni vue,
-- ni job cron à son nom. Supprimer ses six tables suffit ; `profiles` et les
-- comptes restent, puisqu'ils sont communs à toutes les apps.
--
-- Au moment du retrait, la base contenait un profil et deux habitudes de
-- test, aucune validation : rien qui justifie une migration de données.
--
-- Ordre : les tables qui référencent les autres d'abord. `cascade` emporte
-- policies, triggers et index qui leur appartiennent.
-- ============================================================

drop table if exists public.groot_user_badges cascade;
drop table if exists public.groot_habit_entries cascade;
drop table if exists public.groot_habits cascade;
drop table if exists public.groot_badges cascade;
drop table if exists public.groot_zones cascade;
drop table if exists public.groot_profiles cascade;
