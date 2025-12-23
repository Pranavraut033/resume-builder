import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '@/lib/llm/providers/gemini';
import { sampleBaseProfile, sampleJobDetails } from '../../../fixtures/data';
import { getTestApiKey, getTestModel, shouldUseRealLLMs } from '../../../config/test.config';

// Mock @google/genai (skip if testing with real APIs)
if (!shouldUseRealLLMs()) {
  vi.mock('@google/genai', () => {
    const mockGenerateContent = vi.fn();

    return {
      GoogleGenAI: class MockGoogleGenAI {
        constructor(config: any) { }
        models = {
          generateContent: mockGenerateContent,
        };
      },
    };
  });
}

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockGenerateContent: any;
  const TEST_API_KEY = getTestApiKey('gemini') || 'test-api-key';
  const TEST_MODEL = getTestModel('gemini');
  const useRealAPIs = shouldUseRealLLMs() && TEST_API_KEY && TEST_API_KEY !== 'test-api-key';

  beforeEach(() => {
    provider = new GeminiProvider(TEST_API_KEY);
    if (!useRealAPIs) {
      const geminiClient = (provider as any).client;
      mockGenerateContent = geminiClient.models.generateContent;
    }
  });

  describe('generateResume', () => {
    it('should generate resume using Gemini API', async () => {
      const mockResume = {
        header: { name: 'John Doe', email: 'john@example.com' },
        summary: 'Tailored summary',
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockResume),
      });

      const result = await provider.generateResume({
        baseProfile: sampleBaseProfile,
        jobDescription: sampleJobDetails.raw_description,
        jobRole: sampleJobDetails.job.job_title,
        company: sampleJobDetails.company.company_name,
        model: 'gemini-pro',
      });

      expect(result).toEqual(mockResume);
    });

    it('should use default model when not specified', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({}),
      });

      await provider.generateResume({
        baseProfile: sampleBaseProfile,
        jobDescription: sampleJobDetails.raw_description,
        jobRole: sampleJobDetails.job.job_title,
        company: sampleJobDetails.company.company_name,
      });

      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should throw error on API failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(
        provider.generateResume({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        })
      ).rejects.toThrow('Gemini generateResume failed');
    });

    it('should throw error on invalid JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'invalid json',
      });

      await expect(
        provider.generateResume({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        })
      ).rejects.toThrow('Invalid JSON');
    });
  });

  describe('generateCoverLetter', () => {
    it('should generate cover letter', async () => {
      const mockCoverLetter = 'Dear Hiring Manager, ...';

      mockGenerateContent.mockResolvedValue({
        text: mockCoverLetter,
      });

      const result = await provider.generateCoverLetter({
        baseProfile: sampleBaseProfile,
        jobDescription: sampleJobDetails.raw_description,
        jobRole: sampleJobDetails.job.job_title,
        company: sampleJobDetails.company.company_name,
        resume: sampleBaseProfile,
      });

      expect(result).toBe(mockCoverLetter);
    });

    it('should handle empty response', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '',
      });

      const result = await provider.generateCoverLetter({
        baseProfile: sampleBaseProfile,
        jobDescription: sampleJobDetails.raw_description,
        jobRole: sampleJobDetails.job.job_title,
        company: sampleJobDetails.company.company_name,
        resume: sampleBaseProfile,
      });

      expect(result).toBe('');
    });
  });

  describe('fetchModels', () => {
    it('should return hardcoded Gemini models', async () => {
      (global.fetch as any) = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await provider.fetchModels();

      expect(result).toEqual([
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
      ]);
    });
  });
});
