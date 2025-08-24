import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/genai';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('Missing GEMINI_API_KEY in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export const useGemini = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setIsLoading(false);
      return text;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMsg);
      setIsLoading(false);
      throw e;
    }
  };

  return { generate, isLoading, error };
};