import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadMealImage(userId: string, file: File): Promise<string> {
  const fileName = `${userId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('meal-images')
    .upload(fileName, file, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('meal-images').getPublicUrl(data.path);
  return urlData.publicUrl;
}