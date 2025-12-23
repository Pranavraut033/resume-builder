import { GoogleGenAI } from '@google/genai';
import { LLMProvider, ResumePromptInput, CoverLetterPromptInput } from '@/types/llm';
import { ResumeJSON } from '@/types/resume';
import { BaseLLMProvider } from './baseProvider';

export class GeminiProvider extends BaseLLMProvider implements LLMProvider {
  private client: GoogleGenAI;
  private model: string;
  private apiKey: string;
  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    super();
    this.apiKey = apiKey;
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    const prompt = this.generateResumePrompt(input);

    try {
      const response = await this.client.models.generateContent({
        model: input.model || this.model,
        contents: prompt,
      });

      const content = response.text;
      if (!content) throw new Error('No response from Gemini');

      return JSON.parse(content) as ResumeJSON;
    } catch (e: any) {
      if (e.message && e.message.includes('JSON')) {
        throw new Error('Invalid JSON response from Gemini');
      }
      throw new Error('Gemini generateResume failed: ' + e.message);
    }
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    const response = await this.client.models.generateContent({
      model: input.model || this.model,
      contents: prompt,
    });

    return response.text || '';
  }

  async fetchModels(): Promise<string[]> {
    return fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: {
        "x-goog-api-key": this.apiKey,
      },
    }).then(res => res.json()).then(data => {
      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid response from Gemini models API');
      }
      return data.models.map((model: any) => model.name);
    }).catch((error) => {
      console.error('Error fetching Gemini models:', error);
      return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']; // fallback
    });
  }
}