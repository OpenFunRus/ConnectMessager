import { getTRPCClient } from '@/lib/trpc';
import { uploadFiles } from '@/helpers/upload-file';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { escapePlainTextToHtml } from '../utils';
import { prepareMessageHtml, type TTempFile } from '@connectmessager/shared';
import type {
  ChangeEvent as ReactChangeEvent,
  DragEvent as ReactDragEvent
} from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type TUsePrototypeAttachmentsParams = {
  activeChatId: string | null;
  publicStorageMaxFilesPerMessage?: number | null;
  roleFilesPerMessageLimit: number | null;
  roleAllowedFileExtensions: Set<string> | null;
  roleAllowedFileFormatsLabel: string | null;
  roleFileSizeBytesLimit: number | null;
  resolveChannelIdForChat: (chatId: string) => Promise<number | null>;
  onSuccessfulSendToChat: (chatId: string, channelId: number) => Promise<void>;
  handleSendActionError: (error: unknown, fallbackMessage: string) => void;
};

const usePrototypeAttachments = ({
  activeChatId,
  publicStorageMaxFilesPerMessage,
  roleFilesPerMessageLimit,
  roleAllowedFileExtensions,
  roleAllowedFileFormatsLabel,
  roleFileSizeBytesLimit,
  resolveChannelIdForChat,
  onSuccessfulSendToChat,
  handleSendActionError
}: TUsePrototypeAttachmentsParams) => {
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachModalFiles, setAttachModalFiles] = useState<TTempFile[]>([]);
  const [attachModalComment, setAttachModalComment] = useState('');
  const [attachModalUploading, setAttachModalUploading] = useState(false);
  const [attachModalUploadingSize, setAttachModalUploadingSize] = useState(0);
  const [attachModalSending, setAttachModalSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOverlayVisible, setIsDragOverlayVisible] = useState(false);

  const previousActiveChatIdRef = useRef<string | null>(activeChatId);
  const chatDragDepthRef = useRef(0);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);
  const attachModalFilesRef = useRef<TTempFile[]>([]);
  attachModalFilesRef.current = attachModalFiles;

  const deleteTemporaryFiles = useCallback(async (files: TTempFile[]) => {
    if (files.length === 0) return;
    const trpc = getTRPCClient();
    await Promise.allSettled(
      files.map((file) => trpc.files.deleteTemporary.mutate({ fileId: file.id }))
    );
  }, []);

  const applyFilesLimit = useCallback(
    (inputFiles: File[], alreadyAttached: number) => {
      const serverMaxFiles = publicStorageMaxFilesPerMessage ?? Number.MAX_SAFE_INTEGER;
      const maxFilesPerMessage =
        roleFilesPerMessageLimit !== null
          ? Math.min(serverMaxFiles, roleFilesPerMessageLimit)
          : serverMaxFiles;
      const remainingSlots = Math.max(0, maxFilesPerMessage - alreadyAttached);

      if (remainingSlots <= 0) {
        toast.warning(`Достигнут лимит вложений (${maxFilesPerMessage} на сообщение).`);
        return [];
      }

      const extensionFiltered = inputFiles.filter((file) => {
        if (!roleAllowedFileExtensions) return true;
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        return roleAllowedFileExtensions.has(ext);
      });

      if (extensionFiltered.length < inputFiles.length) {
        const formats = roleAllowedFileFormatsLabel || 'не задан';
        toast.warning(`Запрещенный формат файла, разрешены только: ${formats}.`);
      }

      const sizeFiltered = extensionFiltered.filter((file) => {
        if (!roleFileSizeBytesLimit) return true;
        return file.size <= roleFileSizeBytesLimit;
      });

      if (sizeFiltered.length < extensionFiltered.length) {
        toast.warning('Некоторые файлы отклонены: превышен лимит размера файла для вашей роли.');
      }

      const allowed = sizeFiltered.slice(0, remainingSlots);
      if (allowed.length < sizeFiltered.length) {
        const ignored = sizeFiltered.length - allowed.length;
        toast.warning(`${ignored} файл(ов) не добавлено из-за лимита вложений.`);
      }

      return allowed;
    },
    [
      publicStorageMaxFilesPerMessage,
      roleAllowedFileExtensions,
      roleAllowedFileFormatsLabel,
      roleFileSizeBytesLimit,
      roleFilesPerMessageLimit
    ]
  );

  const appendFilesToModal = useCallback(
    async (filesToUpload: File[]) => {
      const allowedFiles = applyFilesLimit(filesToUpload, attachModalFilesRef.current.length);
      if (allowedFiles.length === 0) return;

      const totalSize = allowedFiles.reduce((acc, file) => acc + file.size, 0);
      setAttachModalUploading(true);
      setAttachModalUploadingSize((size) => size + totalSize);

      try {
        const uploaded = await uploadFiles(allowedFiles);
        if (uploaded.length > 0) {
          setAttachModalFiles((prev) => [...prev, ...uploaded]);
        }
      } finally {
        setAttachModalUploading(false);
        setAttachModalUploadingSize((size) => Math.max(0, size - totalSize));
      }
    },
    [applyFilesLimit]
  );

  const closeAttachModal = useCallback(async () => {
    const filesToDelete = attachModalFilesRef.current;
    setIsAttachModalOpen(false);
    setAttachModalComment('');
    setAttachModalFiles([]);
    await deleteTemporaryFiles(filesToDelete);
  }, [deleteTemporaryFiles]);

  const openAttachModal = useCallback(async () => {
    if (!activeChatId) return;

    await deleteTemporaryFiles(attachModalFilesRef.current);
    setAttachModalComment('');
    setAttachModalFiles([]);
    setIsAttachModalOpen(true);
  }, [activeChatId, deleteTemporaryFiles]);

  const openModalFileDialog = useCallback(() => {
    if (!isAttachModalOpen || attachModalUploading || attachModalSending) return;
    if (!modalFileInputRef.current) return;
    modalFileInputRef.current.value = '';
    modalFileInputRef.current.click();
  }, [attachModalSending, attachModalUploading, isAttachModalOpen]);

  const onModalFileInputChange = useCallback(
    async (event: ReactChangeEvent<HTMLInputElement>) => {
      const list = event.currentTarget.files;
      if (!list || list.length === 0) return;
      await appendFilesToModal(Array.from(list));
    },
    [appendFilesToModal]
  );

  const removeAttachModalFile = useCallback(
    async (fileId: string) => {
      const target = attachModalFilesRef.current.find((file) => file.id === fileId);
      setAttachModalFiles((prev) => prev.filter((file) => file.id !== fileId));
      if (!target) return;
      await deleteTemporaryFiles([target]);
    },
    [deleteTemporaryFiles]
  );

  const sendFilesToActiveChat = useCallback(
    async (chatId: string, tempFiles: TTempFile[], comment: string) => {
      const channelId = await resolveChannelIdForChat(chatId);
      if (!channelId) return false;

      const content = comment.trim()
        ? prepareMessageHtml(escapePlainTextToHtml(comment.trim()))
        : '';

      try {
        await getTRPCClient().messages.send.mutate({
          channelId,
          content,
          files: tempFiles.map((file) => file.id)
        });

        playSound(SoundType.MESSAGE_SENT);
        await onSuccessfulSendToChat(chatId, channelId);
        return true;
      } catch (error) {
        handleSendActionError(error, 'Не удалось отправить файлы.');
        return false;
      }
    },
    [handleSendActionError, onSuccessfulSendToChat, resolveChannelIdForChat]
  );

  const submitAttachModal = useCallback(async () => {
    const files = attachModalFilesRef.current;
    if (!activeChatId || files.length === 0 || attachModalUploading || attachModalSending) return;

    setAttachModalSending(true);
    try {
      const success = await sendFilesToActiveChat(activeChatId, files, attachModalComment);
      if (!success) {
        return;
      }
      setIsAttachModalOpen(false);
      setAttachModalComment('');
      setAttachModalFiles([]);
    } catch (error) {
      handleSendActionError(error, 'Не удалось отправить файлы.');
    } finally {
      setAttachModalSending(false);
    }
  }, [
    activeChatId,
    attachModalComment,
    attachModalSending,
    attachModalUploading,
    handleSendActionError,
    sendFilesToActiveChat
  ]);

  const sendFilesImmediately = useCallback(
    async (chatId: string, incomingFiles: File[]) => {
      if (incomingFiles.length === 0) return;
      const channelId = await resolveChannelIdForChat(chatId);
      if (!channelId) {
        toast.error('Для этого чата отправка файлов пока недоступна.');
        return;
      }

      const allowed = applyFilesLimit(incomingFiles, 0);
      if (allowed.length === 0) return;

      setUploading(true);

      let uploaded: TTempFile[] = [];
      try {
        uploaded = await uploadFiles(allowed);
        if (uploaded.length === 0) return;
        await getTRPCClient().messages.send.mutate({
          channelId,
          content: '',
          files: uploaded.map((file) => file.id)
        });
        playSound(SoundType.MESSAGE_SENT);
        await onSuccessfulSendToChat(chatId, channelId);
      } catch {
        toast.error('Не удалось отправить файлы.');
        await deleteTemporaryFiles(uploaded);
      } finally {
        setUploading(false);
      }
    },
    [applyFilesLimit, deleteTemporaryFiles, onSuccessfulSendToChat, resolveChannelIdForChat]
  );

  const hasDraggedFiles = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const types = event.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  }, []);

  const onChatDragEnter = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      chatDragDepthRef.current += 1;
      setIsDragOverlayVisible(true);
    },
    [hasDraggedFiles]
  );

  const onChatDragOver = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (!isDragOverlayVisible) {
        setIsDragOverlayVisible(true);
      }
    },
    [hasDraggedFiles, isDragOverlayVisible]
  );

  const onChatDragLeave = useCallback((event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    chatDragDepthRef.current = Math.max(0, chatDragDepthRef.current - 1);
    if (chatDragDepthRef.current === 0) {
      setIsDragOverlayVisible(false);
    }
  }, []);

  const onChatDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault();
      chatDragDepthRef.current = 0;
      setIsDragOverlayVisible(false);
      const list = event.dataTransfer?.files;
      if (!activeChatId || !list || list.length === 0) return;
      void sendFilesImmediately(activeChatId, Array.from(list));
    },
    [activeChatId, sendFilesImmediately]
  );

  const onChatPaste = useCallback(() => {
    // handled globally in capture phase for reliable file paste behavior
  }, []);

  useEffect(() => {
    const handleWindowPaste = (event: ClipboardEvent) => {
      if (!activeChatId) return;
      const items = event.clipboardData?.items ?? [];
      const filesToSend: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i]?.kind !== 'file') continue;
        const file = items[i]?.getAsFile();
        if (file) filesToSend.push(file);
      }
      if (filesToSend.length === 0) return;
      event.preventDefault();
      void sendFilesImmediately(activeChatId, filesToSend);
    };

    window.addEventListener('paste', handleWindowPaste, true);
    return () => {
      window.removeEventListener('paste', handleWindowPaste, true);
    };
  }, [activeChatId, sendFilesImmediately]);

  useEffect(() => {
    const previousChatId = previousActiveChatIdRef.current;
    if (previousChatId === activeChatId) return;
    previousActiveChatIdRef.current = activeChatId;

    if (!isAttachModalOpen) return;
    const filesToDelete = attachModalFilesRef.current;
    setIsAttachModalOpen(false);
    setAttachModalComment('');
    setAttachModalFiles([]);
    void deleteTemporaryFiles(filesToDelete);
  }, [activeChatId, deleteTemporaryFiles, isAttachModalOpen]);

  useEffect(
    () => () => {
      void deleteTemporaryFiles(attachModalFilesRef.current);
    },
    [deleteTemporaryFiles]
  );

  return {
    isAttachModalOpen,
    attachModalFiles,
    attachModalComment,
    setAttachModalComment,
    attachModalUploading,
    attachModalUploadingSize,
    attachModalSending,
    uploading,
    isDragOverlayVisible,
    modalFileInputRef,
    openAttachModal,
    closeAttachModal,
    openModalFileDialog,
    onModalFileInputChange,
    removeAttachModalFile,
    submitAttachModal,
    onChatDragEnter,
    onChatDragOver,
    onChatDragLeave,
    onChatDrop,
    onChatPaste
  };
};

export { usePrototypeAttachments };
