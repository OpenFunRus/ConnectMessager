import { useCallback, useMemo, useState } from 'react';

const usePrototypeDrafts = (initialChatId: string) => {
  const [draftHtmlByChatId, setDraftHtmlByChatId] = useState<Record<string, string>>({
    [initialChatId]: ''
  });

  const getDraftForChat = useCallback(
    (chatId: string | null | undefined) => {
      if (!chatId) return '';
      return draftHtmlByChatId[chatId] ?? '';
    },
    [draftHtmlByChatId]
  );

  const setDraftForChat = useCallback((chatId: string, value: string) => {
    setDraftHtmlByChatId((prev) => ({
      ...prev,
      [chatId]: value
    }));
  }, []);

  const clearDraftForChat = useCallback((chatId: string) => {
    setDraftHtmlByChatId((prev) => ({
      ...prev,
      [chatId]: ''
    }));
  }, []);

  return useMemo(
    () => ({
      draftHtmlByChatId,
      getDraftForChat,
      setDraftForChat,
      clearDraftForChat
    }),
    [clearDraftForChat, draftHtmlByChatId, getDraftForChat, setDraftForChat]
  );
};

export { usePrototypeDrafts };
