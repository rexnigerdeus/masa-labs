/**
 * Formes des lignes lues en base. Elles suivent les colonnes de
 * `supabase/migrations/20260906120000_hive_lot1.sql` sans les transformer :
 * une deuxième nomenclature côté application ferait deux endroits à corriger
 * à chaque évolution du schéma.
 */

export type Condition = 'neuf' | 'occasion';
export type ListingStatus = 'publie' | 'retire' | 'suspendu';
export type OrderKind = 'location' | 'achat';
export type OrderStatus = 'demandee' | 'confirmee' | 'en_cours' | 'terminee' | 'annulee';
export type PaymentMethod = 'main_propre' | 'en_ligne';
export type PaymentStatus = 'non_paye' | 'en_attente' | 'paye' | 'rembourse';

export type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category_id: string;
  condition: Condition;
  for_rent: boolean;
  for_sale: boolean;
  /** Montants en francs CFA entiers : le FCFA n'a pas de centime. */
  rent_price_day: number | null;
  rent_price_week: number | null;
  sale_price: number | null;
  commune: string;
  /** Chemins dans le bucket `hive-listings`, pas des URL. */
  photos: string[];
  status: ListingStatus;
  created_at: string;
};

export type Order = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  kind: OrderKind;
  start_date: string | null;
  end_date: string | null;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  message: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
