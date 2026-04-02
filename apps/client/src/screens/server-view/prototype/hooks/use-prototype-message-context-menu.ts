import type { TMessage, TMessageContextMenuState } from '../types';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

type TUsePrototypeMessageContextMenuParams = {
  ownUserId?: number;
};

const usePrototypeMessageContextMenu = ({
  ownUserId
}: TUsePrototypeMessageContextMenuParams) => {
  const [messageContextMenu, setMessageContextMenu] =
    useState<TMessageContextMenuState | null>(null);
  const messageContextMenuRef = useRef<HTMLDivElement | null>(null);

  const closeMessageContextMenu = useCallback(() => {
    setMessageContextMenu(null);
  }, []);

  const handleMessageContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>, message: TMessage) => {
      event.preventDefault();
      event.stopPropagation();

      const MENU_WIDTH = 220;
      const MENU_ITEM_HEIGHT = 36;
      const menuItemCount = message.userId === ownUserId ? 5 : 4;
      const menuHeight = menuItemCount * MENU_ITEM_HEIGHT + 8;
      const maxX = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
      const maxY = Math.max(8, window.innerHeight - menuHeight - 8);

      setMessageContextMenu({
        messageId: message.id,
        messageUserId: message.userId,
        isOwnMessage: message.userId === ownUserId,
        messageAuthor: message.author,
        messageText: message.text,
        messagePinned: !!message.pinned,
        x: Math.max(8, Math.min(event.clientX, maxX)),
        y: Math.max(8, Math.min(event.clientY, maxY))
      });
    },
    [ownUserId]
  );

  useEffect(() => {
    if (!messageContextMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (messageContextMenuRef.current?.contains(target)) return;
      closeMessageContextMenu();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMessageContextMenu();
      }
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeMessageContextMenu, messageContextMenu]);

  return {
    messageContextMenu,
    messageContextMenuRef,
    closeMessageContextMenu,
    handleMessageContextMenu
  };
};

export { usePrototypeMessageContextMenu };
