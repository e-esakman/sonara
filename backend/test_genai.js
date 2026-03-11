import { GoogleGenAI } from '@google/genai';
const apiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) { console.error('GOOGLE_GENAI_API_KEY is not set'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });
console.log(Object.keys(ai.live));
