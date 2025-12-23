import OpenAI from 'openai';
import { LLMProvider, ResumePromptInput, CoverLetterPromptInput } from '@/types/llm';
import { ResumeJSON, JobDetails, JobDetailsSchema } from '@/types/resume';
import { BaseLLMProvider } from './baseProvider';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Perplexity');

export class PerplexityProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.perplexity.ai',
      dangerouslyAllowBrowser: true // Safe in Tauri desktop app with local encrypted storage
    });
  }

  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    const prompt = this.generateResumePrompt(input);

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: input.model || 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
    } catch (err: any) {
      logger.error('generateResume failed', { error: err, message: err?.message });
      throw new Error(`Perplexity generateResume failed: ${err?.message || err}`);
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from Perplexity');

    try {
      return JSON.parse(content) as ResumeJSON;
    } catch (e) {
      throw new Error('Invalid JSON response from Perplexity');
    }
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: input.model || 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
    } catch (err: any) {
      logger.error('generateCoverLetter failed', { error: err, message: err?.message });
      throw new Error(`Perplexity generateCoverLetter failed: ${err?.message || err}`);
    }

    return response.choices[0]?.message?.content || '';
  }

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug('Fetching models from Perplexity API');

      // Perplexity doesn't have a models.list() endpoint, so return hardcoded models
      return [
        'sonar-deep-research',
        'sonar-reasoning-pro',
        'sonar-pro',
        'sonar'
      ];
    } catch (error) {
      logger.error('Error fetching models', { error });
      return ['sonar-pro']; // fallback
    }
  }

  async parseJobDetails(description: string, model?: string): Promise<JobDetails> {
    const systemPrompt = this.generateJobParsingSystemPrompt();

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: model || 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${description}\n\nRespond with ONLY valid JSON matching this structure:\n${JSON.stringify(JobDetailsSchema.shape)}` },
        ],
        temperature: 0.3,
      });
    } catch (err: any) {
      logger.error('parseJobDetails failed', { error: err, message: err?.message });
      throw new Error(`Perplexity parseJobDetails failed: ${err?.message || err}`);
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from Perplexity');

    try {
      const parsed = JSON.parse(content);
      return JobDetailsSchema.parse(parsed);
    } catch (e: any) {
      logger.warn('Failed to parse job details from Perplexity response', { error: e?.message });
      throw new Error('Failed to parse job details from Perplexity');
    }
  }
}
