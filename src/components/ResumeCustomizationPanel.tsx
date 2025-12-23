// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Eye, Download } from 'lucide-react';
import {
  ResumeCustomization,
  DEFAULT_CUSTOMIZATION,
  TemplateType,
  PageFormat,
  FontSize,
  AVAILABLE_FONTS,
} from '@/types/resume';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { FormField } from './ui/FormField';
import { Modal } from './ui/Modal';
import { TemplateSelector } from './TemplateSelector';
import { ColorCustomizer } from './ColorCustomizer';

interface ResumeCustomizationPanelProps {
  jobId: number;
  customization: ResumeCustomization;
  onCustomizationChange: (customization: Partial<ResumeCustomization>) => void;
}

export const ResumeCustomizationPanel: React.FC<ResumeCustomizationPanelProps> = ({
  jobId,
  customization,
  onCustomizationChange,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'colors' | 'format'>('template');

  const handleTemplateChange = (template: TemplateType) => {
    onCustomizationChange({ template });
  };

  const handlePageFormatChange = (pageFormat: PageFormat) => {
    onCustomizationChange({ pageFormat });
  };

  const handleFontSizeChange = (fontSize: FontSize) => {
    onCustomizationChange({ fontSize });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    onCustomizationChange({ fontFamily });
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 flex gap-2 z-10">
        <Button
          onClick={() => setShowSettings(true)}
          className="rounded-full w-12 h-12 shadow-lg"
          title="Customize Resume"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Customization Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Customize Resume"
      >
        <div className="space-y-block">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-blocky-300 pb-2">
            <button
              onClick={() => setActiveTab('template')}
              className={`px-4 py-2 rounded-block font-medium transition-all ${
                activeTab === 'template'
                  ? 'bg-blocky-500 text-white'
                  : 'bg-blocky-100 text-blocky-700 hover:bg-blocky-200'
              }`}
            >
              Template
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`px-4 py-2 rounded-block font-medium transition-all ${
                activeTab === 'colors'
                  ? 'bg-blocky-500 text-white'
                  : 'bg-blocky-100 text-blocky-700 hover:bg-blocky-200'
              }`}
            >
              Colors
            </button>
            <button
              onClick={() => setActiveTab('format')}
              className={`px-4 py-2 rounded-block font-medium transition-all ${
                activeTab === 'format'
                  ? 'bg-blocky-500 text-white'
                  : 'bg-blocky-100 text-blocky-700 hover:bg-blocky-200'
              }`}
            >
              Format
            </button>
          </div>

          {/* Tab Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {activeTab === 'template' && (
              <TemplateSelector
                selectedTemplate={customization.template}
                onSelectTemplate={handleTemplateChange}
              />
            )}

            {activeTab === 'colors' && (
              <ColorCustomizer
                colors={customization.colors}
                onColorsChange={(colors) => onCustomizationChange({ colors })}
              />
            )}

            {activeTab === 'format' && (
              <Card>
                <div className="p-block space-y-block">
                  <div>
                    <h3 className="text-lg font-blocky font-semibold text-blocky-900 mb-2">
                      Page Format
                    </h3>
                    <p className="text-sm text-blocky-700 mb-block">
                      Configure page size, font, and layout
                    </p>
                  </div>

                  {/* Page Size */}
                  <div>
                    <label className="block text-sm font-medium text-blocky-900 mb-2">
                      Page Size
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageFormatChange('letter')}
                        className={`flex-1 px-4 py-3 rounded-block border-2 transition-all ${
                          customization.pageFormat === 'letter'
                            ? 'border-blocky-500 bg-blocky-50'
                            : 'border-blocky-300 hover:border-blocky-400'
                        }`}
                      >
                        <div className="font-medium">US Letter</div>
                        <div className="text-xs text-blocky-600">8.5" × 11"</div>
                      </button>
                      <button
                        onClick={() => handlePageFormatChange('a4')}
                        className={`flex-1 px-4 py-3 rounded-block border-2 transition-all ${
                          customization.pageFormat === 'a4'
                            ? 'border-blocky-500 bg-blocky-50'
                            : 'border-blocky-300 hover:border-blocky-400'
                        }`}
                      >
                        <div className="font-medium">A4</div>
                        <div className="text-xs text-blocky-600">210 × 297 mm</div>
                      </button>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-blocky-900 mb-2">
                      Font Size
                    </label>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => handleFontSizeChange(size)}
                          className={`flex-1 px-4 py-2 rounded-block border-2 transition-all capitalize ${
                            customization.fontSize === size
                              ? 'border-blocky-500 bg-blocky-50'
                              : 'border-blocky-300 hover:border-blocky-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-sm font-medium text-blocky-900 mb-2">
                      Font Family
                    </label>
                    <select
                      value={customization.fontFamily}
                      onChange={(e) => handleFontFamilyChange(e.target.value)}
                      className="w-full px-4 py-2 rounded-block border border-blocky-300 bg-white focus:border-blocky-500 focus:ring-2 focus:ring-blocky-500 focus:ring-opacity-20"
                    >
                      {AVAILABLE_FONTS.map((font) => (
                        <option key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-block border-t border-blocky-300">
            <Button onClick={() => setShowSettings(false)} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
