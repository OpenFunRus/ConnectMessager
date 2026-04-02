import { getFileUrl } from '@/helpers/get-file-url';
import type { TFile } from '@connectmessager/shared';
import { useCallback } from 'react';
import { toast } from 'sonner';

const usePrototypeFileDownload = () => {
  const downloadFileWithPrompt = useCallback(async (file: TFile) => {
    try {
      const fileUrl = getFileUrl(file);
      if (!fileUrl) return;

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const windowWithPicker = window as Window & {
        showSaveFilePicker?: (options?: unknown) => Promise<{
          createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      };

      if (typeof windowWithPicker.showSaveFilePicker === 'function') {
        try {
          const handle = await windowWithPicker.showSaveFilePicker({
            suggestedName: file.originalName
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (error) {
          if ((error as { name?: string })?.name === 'AbortError') return;
        }
      }

      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = file.originalName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      toast.error('Не удалось скачать файл.');
    }
  }, []);

  return {
    downloadFileWithPrompt
  };
};

export { usePrototypeFileDownload };
