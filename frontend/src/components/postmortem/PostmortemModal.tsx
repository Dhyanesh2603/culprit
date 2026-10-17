'use client';

import React, { useState } from 'react';
import { Download, Copy, Check, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface PostmortemModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  incidentNumber: number;
}

export function PostmortemModal({
  isOpen,
  onClose,
  markdownContent,
  incidentNumber,
}: PostmortemModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `incident-${incidentNumber}-postmortem.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Incident Postmortem: #${incidentNumber}`}
      description="Exportable engineering incident report & attribution summary"
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Actions Toolbar */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span>Copy Markdown</span>
              </>
            )}
          </Button>
          <Button variant="accent" size="sm" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5 mr-1" />
            <span>Download .md</span>
          </Button>
        </div>

        {/* Markdown Preview Area */}
        <div className="max-h-96 overflow-y-auto rounded border border-border bg-surface p-4 font-mono text-xs text-primary leading-relaxed whitespace-pre-wrap select-text">
          {markdownContent}
        </div>
      </div>
    </Modal>
  );
}
