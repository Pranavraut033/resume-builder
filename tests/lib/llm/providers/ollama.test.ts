import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '@/lib/llm/providers/ollama';
import { sampleBaseProfile, sampleJobDetails } from '../../../fixtures/data';
import { getTestModel, shouldUseRealLLMs } from '../../../config/test.config';

// Mock fetch globally (skip if testing with real APIs)
if (!shouldUseRealLLMs()) {
  global.fetch = vi.fn();
}

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  const TEST_MODEL = getTestModel('ollama');
  const useRealAPIs = shouldUseRealLLMs();

  beforeEach(() => {
    provider = new OllamaProvider();
    if (!useRealAPIs) {
      vi.clearAllMocks();
    }
  });

  describe('generateResume', () => {
    it('should generate resume using Ollama API', async () => {
      const mockResume = {
        header: { name: 'John Doe', email: 'john@example.com' },
        summary: 'Tailored summary',
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify(mockResume),
        }),
      });

      const result = await provider.generateResume({
        baseProfile: sampleBaseProfile,
        jobDescription: sampleJobDetails.raw_description,
        jobRole: sampleJobDetails.job.job_title,
        company: sampleJobDetails.company.company_name,
        model: 'llama3',
      });

      expect(result).toEqual(mockResume);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use default model when not specified', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({}),
        }),
      });

      await provider.generateResume({
        baseProfile: sampleBaseProfile,
        jobDescription: sampleJobDetails.raw_description,
        jobRole: sampleJobDetails.job.job_title,
        company: sampleJobDetails.company.company_name,
      });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.model).toBe('llama2');
    });

    it('should throw error on API failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        provider.generateResume({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        })
      ).rejects.toThrow('Ollama API error');
    });

    it('should throw error on invalid JSON response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'invalid json',
        }),
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

    it('should throw error on network failure', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(
        provider.generateResume({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('generateCoverLetter', () => {
    it('should generate cover letter using Ollama API', async () => {
      const mockCoverLetter = 'Dear Hiring Manager, ...';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: mockCoverLetter,
        }),
      });

      const result = await provider.generateCoverLetter({
        baseProfile: sampleBaseProfile,
        jobDescription: sampleJobDetails.raw_description,
        jobRole: sampleJobDetails.job.job_title,
        company: sampleJobDetails.company.company_name,
        resume: sampleBaseProfile,
        model: 'llama3',
      });

      expect(result).toBe(mockCoverLetter);
    });

    it('should handle empty response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: '',
        }),
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
    it('should fetch available models from Ollama', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama3:latest' },
            { name: 'codellama:latest' },
            { name: 'mistral:latest' },
          ],
        }),
      });

      const result = await provider.fetchModels();

      expect(result).toEqual(['llama3:latest', 'codellama:latest', 'mistral:latest']);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });

    it('should return fallback message on error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Connection refused'));

      const result = await provider.fetchModels();

      expect(result).toEqual(['llama2', 'llama3']);
    });

    it('should handle empty model list', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [],
        }),
      });

      const result = await provider.fetchModels();

      expect(result).toEqual([]);
    });
  });
});
