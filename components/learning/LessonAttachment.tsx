'use client';

import { Link as LinkIcon } from "lucide-react";
import { getIsNativeApp } from "@/lib/native-detection";

interface LessonAttachmentProps {
  url: string;
  name?: string;
}

export function LessonAttachment({ url, name }: LessonAttachmentProps) {
  const isNative = getIsNativeApp();
  const isPdf = /\.pdf$/i.test(url || '');
  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(url || '');
  const isViewable = isPdf || isImage;
  const useViewer = isNative || isViewable;

  return (
    <a
      href={useViewer ? `/learning/view-file?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || 'Lampiran')}` : url}
      target={useViewer ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer"
    >
      <LinkIcon size={12} className="mr-1" />
      <span>{name || 'Lampiran'}</span>
    </a>
  );
}
