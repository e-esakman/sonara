const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: "foo" });
console.log(Object.keys(ai.live));
