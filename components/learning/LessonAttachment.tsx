'use client';

import { Link as LinkIcon } from "lucide-react";

interface LessonAttachmentProps {
  url: string;
  name?: string;
}

export function LessonAttachment({ url, name }: LessonAttachmentProps) {
  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, '_blank');
      }}
      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer"
    >
      <LinkIcon size={12} className="mr-1" />
      <span>{name || 'Lampiran'}</span>
    </div>
  );
}
