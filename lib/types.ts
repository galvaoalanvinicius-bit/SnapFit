export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose_weight' | 'gain_muscle' | 'maintain';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'pending';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  age: number | null;
  gender: Gender | null;
  weight: number | null;
  height: number | null;
  goal: Goal | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  plan: string;
  mp_subscription_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Recipe {
  name: string;
  description: string;
  calories: number;
  prep_time: string;
}

export interface Meal {
  id: string;
  user_id: string;
  image_url: string | null;
  calories: number | null;
  proteins: number | null;
  carbs: number | null;
  fat: number | null;
  healthy_score: number | null;
  ai_feedback: string | null;
  tips: string[] | null;
  recipes: Recipe[] | null;
  meal_name: string | null;
  created_at: string;
}

export interface MealAnalysis {
  meal_name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fat: number;
  healthy_score: number;
  ai_feedback: string;
  tips: string[];
  recipes: Recipe[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}