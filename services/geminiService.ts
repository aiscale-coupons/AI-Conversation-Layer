import { Contact, IntentType } from '../types';
import { supabase } from '../supabase/client';

// Get the API base URL - use environment variable or default to current origin
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const startCampaign = async (campaignId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.rpc('start_campaign', { campaign_id_to_start: campaignId });

    if (error) {
      console.error('Error calling start_campaign RPC:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error starting campaign:', error);
    return { success: false, error: error.message };
  }
};

const getFallbackContent = (contact: Contact) => ({
    opener: "I was just looking into your company and was very impressed with your work in the industry.",
    subjectA: "Quick Question",
    subjectB: `Thoughts on ${contact.industry}?`
});

/**
 * Generate personalized email content using the backend API
 * This is now secure as the API key is stored on the backend
 */
export const generateEmailContent = async (contact: Contact): Promise<{ opener: string; subjectA: string; subjectB: string; }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        industry: contact.industry,
        painPointSignal: contact.painPointSignal,
        companyName: contact.companyName,
        city: contact.city,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from API:', errorData);
      
      // Use fallback from API response if available
      if (errorData.fallback) {
        return errorData.fallback;
      }
      
      return getFallbackContent(contact);
    }

    const data = await response.json();
    return data as { opener: string; subjectA: string; subjectB: string; };
  } catch (error) {
    console.error("Error generating email content:", error);
    return getFallbackContent(contact);
  }
};

/**
 * Detect the intent of an email reply using the backend API
 * This is now secure as the API key is stored on the backend
 */
export const detectReplyIntent = async (replyText: string): Promise<IntentType> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/detect-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                replyText,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error from API:', errorData);
            return errorData.intent || IntentType.UNKNOWN;
        }

        const data = await response.json();
        return data.intent as IntentType;
    } catch (error) {
        console.error("Error detecting reply intent:", error);
        return IntentType.UNKNOWN;
    }
};