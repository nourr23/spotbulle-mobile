import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/services/supabaseClient';

export interface UploadVideoResult {
  success: true;
  filePath: string;
  publicUrl: string;
  title: string;
}

export interface UploadVideoParams {
  videoUri: string;
  userId: string;
}

export async function uploadVideo({
  videoUri,
  userId,
}: UploadVideoParams): Promise<UploadVideoResult> {
  // Convert local URI to ArrayBuffer (like sawer-bel-akhdher does)
  const base64 = await FileSystem.readAsStringAsync(videoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);

  const fileExt = 'mp4';
  const fileName = `mobile-${Date.now()}.${fileExt}`;
  const filePath = `videos/${userId}/${fileName}`;

  // Upload to storage using ArrayBuffer (like sawer-bel-akhdher)
  const { error: uploadError } = await supabase
    .storage
    .from('videos')
    .upload(filePath, arrayBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Erreur upload: ${uploadError.message || 'Impossible de sauvegarder la vidéo.'}`);
  }

  // Get public URL
  const { data: urlData } = supabase
    .storage
    .from('videos')
    .getPublicUrl(filePath);

  const publicUrl = urlData?.publicUrl || null;

  // Insert into database
  const videoTitle = `Vidéo mobile ${new Date().toLocaleString('fr-FR')}`;
  const insertPayload = {
    title: videoTitle,
    description: 'Vidéo enregistrée depuis le mobile',
    file_path: filePath,
    storage_path: filePath,
    file_size: arrayBuffer.byteLength,
    duration: null,
    user_id: userId,
    status: 'uploaded',
    public_url: publicUrl,
    video_url: publicUrl,
    format: fileExt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from('videos')
    .insert(insertPayload);

  if (insertError) {
    throw new Error(`Erreur base de données: ${insertError.message || 'Impossible de créer la vidéo.'}`);
  }

  return { success: true, filePath, publicUrl, title: videoTitle };
}

