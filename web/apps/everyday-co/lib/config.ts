/**
 * Adresse de l'application Vitae.
 *
 * Vitae a son propre domaine et vit indépendamment du site vitrine (brief §8,
 * « double point d'accès ») : la vitrine y renvoie, elle ne l'héberge pas.
 * Réglable au déploiement pour pointer sur une préproduction.
 */
export const VITAE_URL = process.env.NEXT_PUBLIC_VITAE_URL ?? 'https://vitae.theeveryday.co';
