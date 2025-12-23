'use client';

import { useState, useEffect } from 'react';
import { setApiKey, getApiKey } from '@/lib/keyStorage';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { createLogger } from '@/lib/logger';
import { useModelStore } from '@/store/modelStore';

const logger = createLogger('SettingsPage');

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Use Zustand store for model state
  const {
    modelsByProvider,
    selectedModelsByProvider,
    selectedProvider,
    isLoading,
    error,
    loadModels,
    setProviderModels,
    refreshModels,
    clearError,
  } = useModelStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load models from store
        await loadModels();

        // Load API keys
        const providers = ['openai', 'gemini', 'grok', 'perplexity'];
        const loadedKeys: Record<string, string> = {};
        for (const provider of providers) {
          const key = await getApiKey(provider);
          if (key) loadedKeys[provider] = key;
        }
        setKeys(loadedKeys);
      } catch (error) {
        logger.error('Error loading data', { error });
      }
    };
    loadData();
  }, [loadModels]);


  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    try {
      await Promise.all(
        Object.entries(keys).map(([provider, key]) => setApiKey(provider, key))
      );

      // Refresh models after saving API keys using store
      await refreshModels();

      alert('API keys saved and models refreshed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error saving API keys', { error, errorMessage });
      alert(`Error saving API keys: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllSettings = () => {
    // Settings are already saved to localStorage via store actions
    alert('Settings saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-3">API Key Management</h2>
          <div className="grid grid-cols-1 gap-4">
            {['openai', 'gemini', 'grok', 'perplexity'].map(provider => (
              <FormField
                key={provider}
                label={`${provider} API Key`}
                type="password"
                value={keys[provider] || ''}
                onChange={(v) => setKeys({ ...keys, [provider]: v })}
                placeholder={`Enter ${provider} API key`}
              />
            ))}
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSaveApiKeys}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save API Keys'}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Model Selection</h2>
          <p className="text-sm mb-3 text-muted">
            Select models from each provider. Your selections will be used for resume and cover letter generation.
          </p>

          {error && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
              Error loading models: {error}
              <button
                onClick={clearError}
                className="ml-2 underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* OpenAI Models */}
            {modelsByProvider.openai && modelsByProvider.openai.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  OpenAI Models
                  {selectedProvider === 'openai' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                  )}
                </label>
                <MultiSelect
                  value={selectedModelsByProvider.openai || []}
                  onChange={(models) => setProviderModels('openai', models)}
                  options={modelsByProvider.openai}
                  placeholder={isLoading ? "Loading..." : "Select OpenAI models"}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Gemini Models */}
            {modelsByProvider.gemini && modelsByProvider.gemini.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Gemini Models
                  {selectedProvider === 'gemini' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                  )}
                </label>
                <MultiSelect
                  value={selectedModelsByProvider.gemini || []}
                  onChange={(models) => setProviderModels('gemini', models)}
                  options={modelsByProvider.gemini}
                  placeholder={isLoading ? "Loading..." : "Select Gemini models"}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Grok Models */}
            {modelsByProvider.grok && modelsByProvider.grok.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Grok Models
                  {selectedProvider === 'grok' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                  )}
                </label>
                <MultiSelect
                  value={selectedModelsByProvider.grok || []}
                  onChange={(models) => setProviderModels('grok', models)}
                  options={modelsByProvider.grok}
                  placeholder={isLoading ? "Loading..." : "Select Grok models"}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Perplexity Models */}
            {modelsByProvider.perplexity && modelsByProvider.perplexity.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Perplexity Models
                  {selectedProvider === 'perplexity' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                  )}
                </label>
                <MultiSelect
                  value={selectedModelsByProvider.perplexity || []}
                  onChange={(models) => setProviderModels('perplexity', models)}
                  options={modelsByProvider.perplexity}
                  placeholder={isLoading ? "Loading..." : "Select Perplexity models"}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Ollama Models */}
            {modelsByProvider.ollama && modelsByProvider.ollama.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ollama Models (Local)
                  {selectedProvider === 'ollama' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                  )}
                </label>
                <MultiSelect
                  value={selectedModelsByProvider.ollama || []}
                  onChange={(models) => setProviderModels('ollama', models)}
                  options={modelsByProvider.ollama}
                  placeholder={isLoading ? "Loading..." : "Select Ollama models"}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {Object.values(selectedModelsByProvider).flat().length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <p className="font-medium mb-1">Selected Models Summary:</p>
              <p className="text-muted">
                Total: {Object.values(selectedModelsByProvider).flat().length} model(s) selected
                {selectedProvider && ` • Primary provider: ${selectedProvider}`}
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={saveAllSettings}>Save Settings</Button>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-3">Backup Settings</h2>
        <p>Google Drive backup is optional. Configure API key above for Google services.</p>
      </Card>
    </div>
  );
}