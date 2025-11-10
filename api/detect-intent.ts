import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { z } from 'zod';

// Rate limiting map (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_MAX = 30; // Max requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

// Intent types enum
enum IntentType {
  POSITIVE = 'Positive',
  REFERRAL = 'Referral',
  OBJECTION = 'Objection',
  OPT_OUT = 'Opt-out',
  NEUTRAL = 'Neutral',
  UNKNOWN = 'Unknown',
}

// Input validation schema
const ReplySchema = z.object({
  replyText: z.string().min(1).max(5000),
});

// Intent detection schema for Gemini
const intentDetectionSchema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: [
        IntentType.POSITIVE,
        IntentType.REFERRAL,
        IntentType.OBJECTION,
        IntentType.OPT_OUT,
        IntentType.NEUTRAL,
        IntentType.UNKNOWN,
      ],
      description: 'The detected intent of the email reply.'
    }
  },
  required: ['intent']
};

// Rate limiting function
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting
    const ip = req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    // Validate input
    const validationResult = ReplySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      });
    }

    const { replyText } = validationResult.data;

    // Check for API key
    const apiKey = process.env.VITE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Gemini API key not configured');
      return res.status(500).json({ 
        error: 'Service configuration error',
        intent: IntentType.UNKNOWN
      });
    }

    // Initialize Gemini AI client
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Analyze the following email reply and classify its intent into one of the following categories: Positive, Referral, Objection, Opt-out, Neutral, Unknown.
      
      - Positive: Expresses interest, asks for more info, wants to book a call (e.g., "Yes, let's talk", "How much?", "I'm interested").
      - Referral: Suggests contacting someone else (e.g., "Talk to Bob, not me", "The right person for this is Jane Doe").
      - Objection: Not interested, already have a solution (e.g., "Not interested", "We have a solution", "No thanks").
      - Opt-out: Explicitly asks to be removed from the list (e.g., "Unsubscribe", "Please remove me", "Stop emailing me").
      - Neutral: General non-committal reply (e.g., "Got it, thanks", "Okay").
      - Unknown: Cannot determine the intent.
      
      Email Reply:
      "${replyText}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: intentDetectionSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    return res.status(200).json({ intent: parsedJson.intent });

  } catch (error: any) {
    console.error('Error detecting intent:', error);
    
    // Don't expose internal error details
    return res.status(500).json({ 
      error: 'Failed to detect intent',
      intent: IntentType.UNKNOWN
    });
  }
}
