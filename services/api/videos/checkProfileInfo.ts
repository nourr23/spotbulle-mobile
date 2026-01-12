import { supabase } from '@/services/supabaseClient';

export interface CheckProfileInfoParams {
  userId: string;
}

export interface CheckProfileInfoResponse {
  hasProfileInfo: boolean;
  age?: number;
  ageRange?: string | null; // '16-20', '21-30', '31-45', '46+'
}

/**
 * Check if user has any video with profile_information and extract age
 */
export async function checkVideoProfileInformation(
  params: CheckProfileInfoParams
): Promise<CheckProfileInfoResponse> {
  const { userId } = params;

  try {
    if (!userId) {
      return { hasProfileInfo: false };
    }

    // Get all videos with profile_information
    const { data: videos, error } = await supabase
      .from('videos')
      .select('profile_information')
      .eq('user_id', userId)
      .not('profile_information', 'is', null);

    if (error) {
      console.error('[checkProfileInfo] Error checking profile_information:', error);
      return { hasProfileInfo: false };
    }

    if (!videos || videos.length === 0) {
      return { hasProfileInfo: false };
    }

    // Loop through videos to find one with age
    for (const video of videos) {
      const profileInfo = video.profile_information;

      if (profileInfo && typeof profileInfo === 'object') {
        // Try different possible age field names
        const ageValue =
          profileInfo.age ||
          profileInfo.age_years ||
          profileInfo.ageNumber ||
          profileInfo.age_number ||
          profileInfo.approx_age;

        // Convert to number if it's a string
        const age =
          typeof ageValue === 'string' ? parseInt(ageValue, 10) : ageValue;

        if (age && typeof age === 'number' && !isNaN(age) && age > 0) {
          // Determine age range
          let ageRange: string | null = null;
          if (age >= 16 && age <= 20) ageRange = '16-20';
          else if (age >= 21 && age <= 30) ageRange = '21-30';
          else if (age >= 31 && age <= 45) ageRange = '31-45';
          else if (age >= 46) ageRange = '46+';

          return {
            hasProfileInfo: true,
            age: age,
            ageRange: ageRange,
          };
        }
      }
    }

    // Found videos with profile_information but no age
    return { hasProfileInfo: true, age: null, ageRange: null };
  } catch (error) {
    console.error('[checkProfileInfo] Exception checking profile_information:', error);
    return { hasProfileInfo: false };
  }
}

