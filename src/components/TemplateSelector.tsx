// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { AVAILABLE_TEMPLATES, TemplateType } from '@/types/resume';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
}) => {
  return (
    <Card>
      <div className="p-block">
        <h3 className="text-lg font-blocky font-semibold text-blocky-900 mb-block">
          Choose Resume Template
        </h3>
        <p className="text-sm text-blocky-700 mb-block">
          Select a professional template that best fits your style
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-block">
          {AVAILABLE_TEMPLATES.map((template) => {
            const isSelected = selectedTemplate === template.id;
            
            return (
              <div
                key={template.id}
                className={`
                  relative cursor-pointer rounded-block border-2 p-block
                  transition-all hover:shadow-block
                  ${
                    isSelected
                      ? 'border-blocky-500 bg-blocky-50'
                      : 'border-blocky-300 hover:border-blocky-400'
                  }
                `}
                onClick={() => onSelectTemplate(template.id)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-blocky-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-base text-blocky-900">
                    {template.name}
                  </h4>
                  
                  <p className="text-sm text-blocky-700">
                    {template.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs px-2 py-1 rounded bg-blocky-100 text-blocky-700 border border-blocky-300">
                      {template.fontFamily}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-blocky-700">Features:</p>
                    <ul className="text-xs text-blocky-600 space-y-0.5">
                      {template.features.slice(0, 3).map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <p className="text-xs text-blocky-600 pt-2 border-t border-blocky-200">
                    <span className="font-medium">Best for:</span> {template.bestFor}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
