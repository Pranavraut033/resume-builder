import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { LLMProvider, ResumePromptInput, CoverLetterPromptInput } from '@/types/llm';
import { ResumeJSON, JobDetails, JobDetailsSchema } from '@/types/resume';
import { BaseLLMProvider } from './baseProvider';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OpenAI');

export class OpenAIProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Safe in Tauri desktop app with local encrypted storage
    });
  }

  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    const prompt = this.generateResumePrompt(input);

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: input.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
    } catch (err: any) {
      logger.error('generateResume failed', { error: err, message: err?.message });
      throw new Error(`OpenAI generateResume failed: ${err?.message || err}`);
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    try {
      return JSON.parse(content) as ResumeJSON;
    } catch (e) {
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: input.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
    } catch (err: any) {
      logger.error('generateCoverLetter failed', { error: err, message: err?.message });
      throw new Error(`OpenAI generateCoverLetter failed: ${err?.message || err}`);
    }

    return response.choices[0]?.message?.content || '';
  }

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug('Fetching models from OpenAI API');

      const response = await this.client.models.list();
      return response.data.map(model => model.id).filter(id => id.includes('gpt'));
    } catch (error) {
      logger.error('Error fetching models', { error });
      return ['gpt-4o', 'gpt-3.5-turbo']; // fallback
    }
  }

  async parseJobDetails(description: string, model?: string): Promise<JobDetails> {
    const systemPrompt = this.generateJobParsingSystemPrompt();

    const completion = await this.client.chat.completions.parse({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: description },
      ],
      response_format: zodResponseFormat(JobDetailsSchema, 'job_details'),
    });

    if (!completion.choices[0].message.parsed) {
      throw new Error('Failed to parse job details');
    }

    return completion.choices[0].message.parsed;
  }
}