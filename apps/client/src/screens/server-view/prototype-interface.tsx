import { useFilteredUsers, useOwnUser } from '@/features/server/users/hooks';
import { useChannels } from '@/features/server/channels/hooks';
import { requestConfirmation } from '@/features/dialogs/actions';
import { disconnectFromServer } from '@/features/server/actions';
import { useInfo, usePublicServerSettings } from '@/features/server/hooks';
import {
  isDesktopBridgeAvailable,
  setDesktopUnreadCount,
  showDesktopNotification
} from '@/helpers/desktop-bridge';
import { uploadFiles } from '@/helpers/upload-file';
import { getTRPCClient } from '@/lib/trpc';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { usePrototypeAttachments } from './prototype/hooks/use-prototype-attachments';
import { usePrototypeChatCatalog } from './prototype/hooks/use-prototype-chat-catalog';
import { usePrototypeChatScroll } from './prototype/hooks/use-prototype-chat-scroll';
import { usePrototypeChatMessages } from './prototype/hooks/use-prototype-chat-messages';
import { usePrototypeComposerActions } from './prototype/hooks/use-prototype-composer-actions';
import { usePrototypeComposerEditor } from './prototype/hooks/use-prototype-composer-editor';
import { usePrototypeDrafts } from './prototype/hooks/use-prototype-drafts';
import { usePrototypeEmojiPicker } from './prototype/hooks/use-prototype-emoji-picker';
import { usePrototypeFileDownload } from './prototype/hooks/use-prototype-file-download';
import { usePrototypeImageViewer } from './prototype/hooks/use-prototype-image-viewer';
import { usePrototypeMessageActions } from './prototype/hooks/use-prototype-message-actions';
import { usePrototypeMessageContextMenu } from './prototype/hooks/use-prototype-message-context-menu';
import { usePrototypeMessagePresentation } from './prototype/hooks/use-prototype-message-presentation';
import { usePrototypeMessageRealtime } from './prototype/hooks/use-prototype-message-realtime';
import { usePrototypePinned } from './prototype/hooks/use-prototype-pinned';
import { usePrototypeRoleAccess } from './prototype/hooks/use-prototype-role-access';
import { usePrototypeSettingsRuntime } from './prototype/hooks/use-prototype-settings-runtime';
import { usePrototypeTyping } from './prototype/hooks/use-prototype-typing';
import { usePrototypeUnread } from './prototype/hooks/use-prototype-unread';
import { PrototypeChatPanel } from './prototype/components/prototype-chat-panel';
import { PrototypeComposer } from './prototype/components/prototype-composer';
import {
  PrototypeGroupEditorModal,
  type TPrototypeGroupDraftPayload
} from './prototype/components/prototype-group-editor-modal';
import { PrototypeSidebar } from './prototype/components/prototype-sidebar';
import { PrototypeSettingsModal } from './prototype/settings/settings-modal';
import { ChannelType, hasMention, type TFile } from '@connectmessager/shared';
import type { IRootState } from '@/features/store';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  FILTER_ALL,
  MAIN_GROUP_CHAT_ID,
  NOTES_CHAT_ID,
  SETTINGS_ROLE_FILTER_OPTIONS
} from './prototype/constants';
import type {
  TActiveQuote,
  TMentionNotification,
  TMessage,
  TMessageReactionPickerState
} from './prototype/types';
import {
  extractDisplayTextFromHtml,
  extractMessageQuoteFromHtml,
  getStatusText,
  getGroupChatId,
  hasQuoteForUser,
  normalizeVisibilityFilter,
  stripMessageQuoteFromHtml
} from './prototype/utils';
import './prototype-interface.css';

const PrototypeInterface = memo(() => {
  const ownUser = useOwnUser();
  const channels = useChannels();
  const info = useInfo();
  const publicSettings = usePublicServerSettings();
  const readStatesMap = useSelector((state: IRootState) => state.server.readStatesMap);
  const contacts = useFilteredUsers();
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');
  const [entitySearch, setEntitySearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(NOTES_CHAT_ID);
  const [activeQuote, setActiveQuote] = useState<TActiveQuote | null>(null);
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [groupEditorMode, setGroupEditorMode] = useState<'create' | 'edit'>('create');
  const [groupEditorChannelId, setGroupEditorChannelId] = useState<number | null>(null);
  const [groupEditorSubmitting, setGroupEditorSubmitting] = useState(false);
  const [groupEditorDeleting, setGroupEditorDeleting] = useState(false);
  const { draftHtmlByChatId, getDraftForChat, setDraftForChat, clearDraftForChat } =
    usePrototypeDrafts(NOTES_CHAT_ID);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const composerInputWrapRef = useRef<HTMLDivElement | null>(null);
  const submitMessageRef = useRef<() => void>(() => {});
  const {
    serverRoles,
    settingsRoles,
    setSettingsRoles,
    currentUserLocalRole,
    currentUserRank,
    canManageUsersStrict,
    roleMessageCharsLimit,
    roleMessageLinesLimit,
    roleFilesPerMessageLimit,
    roleFileSizeBytesLimit,
    roleAllowedFileExtensions,
    roleAllowedFileFormatsLabel,
    canUseVoiceCalls,
    canUseVideoCalls,
    canUseRemoteDesktop,
    settingsPermissions,
    findServerRoleByLocalName,
    getHighestLocalRole,
    visibleSettingsRoles
  } = usePrototypeRoleAccess({
    ownUserRoleIds: (ownUser?.roleIds ?? []) as number[]
  });
  const showSendRateLimitToast = useCallback(() => {
    toast.error('Превышен лимит сообщений. Подождите минуту и попробуйте снова.');
  }, []);
  const handleLogout = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: 'Выход из аккаунта',
      message: 'Вы действительно хотите выйти из аккаунта? Автовход будет очищен.',
      confirmLabel: 'Выйти',
      cancelLabel: 'Отмена',
      variant: 'danger'
    });
    if (!confirmed) return;

    disconnectFromServer();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.location.reload();
  }, []);
  const handleSendActionError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const message = error instanceof Error ? error.message : String(error ?? '');
      if (message.includes('Message rate limit exceeded for your role.')) {
        showSendRateLimitToast();
        return;
      }

      toast.error(fallbackMessage);
    },
    [showSendRateLimitToast]
  );
  const deleteTemporaryFileById = useCallback(async (fileId: string | null | undefined) => {
    if (!fileId) return;
    try {
      await getTRPCClient().files.deleteTemporary.mutate({ fileId });
    } catch {
      // ignore cleanup failures
    }
  }, []);
  const uploadGroupAvatar = useCallback(async (file: File | null) => {
    if (!file) return null;
    const uploaded = await uploadFiles([file]);
    return uploaded[0]?.id ?? null;
  }, []);
  const mainGroupChannelId = useMemo(() => {
    const publicTextChannel = [...channels]
      .filter((channel) => !channel.isDm && !channel.isGroupChannel && channel.type === ChannelType.TEXT)
      .sort((a, b) => a.position - b.position || a.id - b.id)[0];

    if (publicTextChannel) {
      return publicTextChannel.id;
    }

    const fallbackPublicChannel = [...channels]
      .filter((channel) => !channel.isDm && !channel.isGroupChannel)
      .sort((a, b) => a.position - b.position || a.id - b.id)[0];

    return fallbackPublicChannel?.id ?? null;
  }, [channels]);
  const groupChannels = useMemo(
    () =>
      [...channels]
        .filter((channel) => !channel.isDm && channel.isGroupChannel && channel.type === ChannelType.TEXT)
        .sort((a, b) => a.position - b.position || a.id - b.id),
    [channels]
  );
  const groupChannelByChatId = useMemo(
    () =>
      groupChannels.reduce<Record<string, number>>((acc, channel) => {
        acc[getGroupChatId(channel.id)] = channel.id;
        return acc;
      }, {}),
    [groupChannels]
  );
  const groupEditorTarget = useMemo(
    () => groupChannels.find((channel) => channel.id === groupEditorChannelId) ?? null,
    [groupChannels, groupEditorChannelId]
  );
  const lockedGroupFilter = useMemo(() => {
    const currentFilter = normalizeVisibilityFilter(currentUserLocalRole);
    return currentFilter !== FILTER_ALL ? currentFilter : null;
  }, [currentUserLocalRole]);
  const groupFilterOptions = useMemo(
    () => (lockedGroupFilter ? [lockedGroupFilter] : [...SETTINGS_ROLE_FILTER_OPTIONS]),
    [lockedGroupFilter]
  );
  const openCreateGroup = useCallback(() => {
    if (!settingsPermissions.canManageGroups) return;
    setGroupEditorMode('create');
    setGroupEditorChannelId(null);
    setGroupEditorOpen(true);
    setActiveTab('groups');
  }, [settingsPermissions.canManageGroups]);
  const openEditGroup = useCallback(
    (chatId: string) => {
      const channelId = groupChannelByChatId[chatId];
      if (!channelId || !settingsPermissions.canManageGroups) return;
      setGroupEditorMode('edit');
      setGroupEditorChannelId(channelId);
      setGroupEditorOpen(true);
      setActiveTab('groups');
    },
    [groupChannelByChatId, settingsPermissions.canManageGroups]
  );
  const closeGroupEditor = useCallback(() => {
    if (groupEditorSubmitting || groupEditorDeleting) return;
    setGroupEditorOpen(false);
    setGroupEditorChannelId(null);
    setGroupEditorMode('create');
  }, [groupEditorDeleting, groupEditorSubmitting]);
  const createGroup = useCallback(
    async (payload: TPrototypeGroupDraftPayload) => {
      let tempAvatarId: string | null = null;
      setGroupEditorSubmitting(true);
      try {
        tempAvatarId = await uploadGroupAvatar(payload.avatarFile);
        const channelId = await getTRPCClient().channels.add.mutate({
          type: ChannelType.TEXT,
          name: payload.name,
          categoryId: null,
          isGroupChannel: true,
          groupDescription: payload.description || null,
          groupFilter: payload.filter,
          groupAvatarTempFileId: tempAvatarId
        });
        setGroupEditorOpen(false);
        setActiveTab('groups');
        setActiveChatId(getGroupChatId(channelId));
        toast.success('Группа создана.');
      } catch (error) {
        await deleteTemporaryFileById(tempAvatarId);
        handleSendActionError(error, 'Не удалось создать группу.');
      } finally {
        setGroupEditorSubmitting(false);
      }
    },
    [deleteTemporaryFileById, handleSendActionError, uploadGroupAvatar]
  );
  const updateGroup = useCallback(
    async (channelId: number, payload: TPrototypeGroupDraftPayload) => {
      let tempAvatarId: string | null = null;
      setGroupEditorSubmitting(true);
      try {
        tempAvatarId = await uploadGroupAvatar(payload.avatarFile);
        await getTRPCClient().channels.update.mutate({
          channelId,
          name: payload.name,
          groupDescription: payload.description || null,
          groupFilter: payload.filter,
          groupAvatarTempFileId: tempAvatarId,
          clearGroupAvatar: payload.clearAvatar
        });
        setGroupEditorOpen(false);
        toast.success('Группа сохранена.');
      } catch (error) {
        await deleteTemporaryFileById(tempAvatarId);
        handleSendActionError(error, 'Не удалось сохранить группу.');
      } finally {
        setGroupEditorSubmitting(false);
      }
    },
    [deleteTemporaryFileById, handleSendActionError, uploadGroupAvatar]
  );
  const deleteGroup = useCallback(
    async (channelId: number) => {
      const confirmed = await requestConfirmation({
        title: 'Удаление группы',
        message: 'Удалить группу полностью вместе со всей историей, сообщениями и вложениями?',
        confirmLabel: 'Удалить',
        cancelLabel: 'Отмена',
        variant: 'danger'
      });
      if (!confirmed) return;

      setGroupEditorDeleting(true);
      try {
        await getTRPCClient().channels.delete.mutate({ channelId });
        if (activeChatId === getGroupChatId(channelId)) {
          setActiveChatId(MAIN_GROUP_CHAT_ID);
        }
        setGroupEditorOpen(false);
        toast.success('Группа удалена.');
      } catch (error) {
        handleSendActionError(error, 'Не удалось удалить группу.');
      } finally {
        setGroupEditorDeleting(false);
      }
    },
    [activeChatId, handleSendActionError]
  );
  const deleteGroupByChatId = useCallback(
    (chatId: string) => {
      const channelId = groupChannelByChatId[chatId];
      if (!channelId || !settingsPermissions.canManageGroups) return;
      void deleteGroup(channelId);
    },
    [deleteGroup, groupChannelByChatId, settingsPermissions.canManageGroups]
  );
  const resolveAuthorName = useCallback((userId: number) => {
    if (userId === ownUser?.id) {
      return ownUser?.name || 'Вы';
    }
    const found = contacts.find((user) => user.id === userId);
    return found?.name || 'Пользователь';
  }, [contacts, ownUser?.id, ownUser?.name]);
  const resolveAuthorAvatar = useCallback((userId: number) => {
    if (userId === ownUser?.id) {
      return ownUser?.avatar ?? null;
    }
    const found = contacts.find((user) => user.id === userId);
    return found?.avatar ?? null;
  }, [contacts, ownUser?.avatar, ownUser?.id]);

  const mapRawMessagesToAsc = useCallback(
    (
      rawMessages: Array<{
        id: number;
        userId: number;
        content: string | null;
        createdAt: number;
        files?: TFile[];
        reactions?: TMessage['reactions'];
        pinned?: boolean | null;
        pinnedAt?: number | null;
        pinnedBy?: number | null;
      }>
    ): TMessage[] =>
      [...rawMessages].reverse().map((message) => {
        const html = message.content ?? '';
        const bodyHtml = stripMessageQuoteFromHtml(html);
        const hasOwnQuote = hasQuoteForUser(message.content, ownUser?.id);

        return {
          id: message.id,
          userId: message.userId,
          author: resolveAuthorName(message.userId),
          avatar: resolveAuthorAvatar(message.userId),
          html,
          text: extractDisplayTextFromHtml(bodyHtml) || '',
          quote: extractMessageQuoteFromHtml(html),
          createdAt: message.createdAt,
          files: message.files ?? [],
          reactions: message.reactions ?? [],
          pinned: !!message.pinned,
          pinnedAt: message.pinnedAt ?? null,
          pinnedBy: message.pinnedBy ?? null,
          hasOwnMention: hasMention(message.content, ownUser?.id),
          hasOwnQuote
        };
      }),
    [ownUser?.id, resolveAuthorAvatar, resolveAuthorName]
  );
  const {
    dmChannelByChatId,
    messagesByChatId,
    dmUnreadByChatId,
    setMessagesByChatId,
    setPagingByChatId,
    messagesByChatIdRef,
    pagingByChatIdRef,
    dmChannelByChatIdRef,
    getHasMoreAfter,
    loadCurrentWindowForChat,
    loadOlderWindowForChat,
    loadNewerWindowForChat,
    resolveChannelIdForChat,
    getChatIdByChannelId,
    refreshDmConversations
  } = usePrototypeChatMessages({
    ownUserId: ownUser?.id,
    activeChatId,
    contactsLength: contacts.length,
    mainGroupChannelId,
    groupChannelByChatId,
    mapRawMessagesToAsc
  });

  const {
    unreadMessageIdsByChatIdRef,
    serverUnreadByChatId,
    serverUnreadDismissedByChatId,
    setServerUnreadDismissedByChatId,
    getUnreadCountForChat,
    addUnreadMessageIds,
    removeUnreadMessageIds
  } = usePrototypeUnread({
    readStatesMap,
    dmChannelByChatId,
    groupChannelByChatId,
    dmUnreadByChatId,
    mainGroupChannelId
  });
  const {
    filteredChats,
    activeChat,
    contactsHasUnread,
    groupsHasUnread,
    isNotesChat
  } = usePrototypeChatCatalog({
    infoName: info?.name,
    contacts: contacts.map((user) => ({
      id: user.id,
      name: user.name,
      status: user.status,
      roleIds: (user.roleIds ?? []) as number[],
      avatar: user.avatar ?? null
    })),
    groupChannels,
    activeTab,
    entitySearch,
    activeChatId,
    currentUserLocalRole,
    getHighestLocalRole,
    getUnreadCountForChat,
    setActiveChatId,
    setActiveTab,
    canManageGroups: settingsPermissions.canManageGroups
  });
  const {
    recentEmojiNames,
    isEmojiPickerOpen,
    setIsEmojiPickerOpen,
    emojiPanelTab,
    setEmojiPanelTab,
    gifSearch,
    setGifSearch,
    gifItems,
    gifLoading,
    gifLoadFailed,
    emojiButtonRef,
    emojiPopoverRef,
    addRecentEmoji,
    addRecentGif
  } = usePrototypeEmojiPicker();
  const { downloadFileWithPrompt } = usePrototypeFileDownload();
  const {
    imageViewerFile,
    imageViewerZoom,
    imageViewerPan,
    isImageViewerPanning,
    imageViewerStageRef,
    openImageViewer,
    closeImageViewer,
    onImageViewerWheel,
    onImageViewerPointerDown,
    onImageViewerPointerMove,
    onImageViewerPointerUp,
    onImageViewerLostPointerCapture
  } = usePrototypeImageViewer(activeChatId);
  const {
    messageContextMenu,
    messageContextMenuRef,
    closeMessageContextMenu,
    handleMessageContextMenu
  } = usePrototypeMessageContextMenu({
    ownUserId: ownUser?.id
  });
  const [messageReactionPicker, setMessageReactionPicker] =
    useState<TMessageReactionPickerState | null>(null);

  const draftHtml = getDraftForChat(activeChatId);

  const visibleMessages = useMemo(() => {
    if (!activeChat) return [];
    const source = messagesByChatId[activeChat.id] || [];
    const term = messageSearch.trim().toLowerCase();
    if (!term) return source;
    return source.filter((msg) => msg.text.toLowerCase().includes(term));
  }, [activeChat, messageSearch, messagesByChatId]);
  const {
    renderMessages,
    emojiByShortcode,
    topRecentEmojis,
    emojiGroups,
    renderMessageContent,
    onMessageCopy
  } = usePrototypeMessagePresentation({
    recentEmojiNames,
    visibleMessages
  });

  const {
    isPinnedPopoverOpen,
    setIsPinnedPopoverOpen,
    pinnedMessages,
    pinnedLoading,
    refreshPinnedForActiveChat,
    removePinnedUserMessages
  } = usePrototypePinned({
    activeChatId: activeChat?.id ?? null,
    mainGroupChannelId,
    dmChannelByChatIdRef,
    resolveChannelIdForChat,
    resolveAuthorName
  });
  const [isMentionPopoverOpen, setIsMentionPopoverOpen] = useState(false);
  const [mentionNotifications, setMentionNotifications] = useState<TMentionNotification[]>([]);
  const [pendingMentionJump, setPendingMentionJump] = useState<{
    chatId: string;
    messageId: number;
  } | null>(null);

  const upsertMentionNotification = useCallback((item: TMentionNotification) => {
    setMentionNotifications((prev) =>
      [item, ...prev.filter((entry) => entry.messageId !== item.messageId)].sort(
        (a, b) => b.createdAt - a.createdAt
      )
    );
  }, []);

  const removeMentionNotification = useCallback((messageId: number) => {
    setMentionNotifications((prev) =>
      prev.filter((entry) => entry.messageId !== messageId)
    );
  }, []);

  const handleLocalDeletedUser = useCallback(
    async (userId: number) => {
      setMessagesByChatId((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([chatId, messages]) => [
            chatId,
            messages.filter((message) => message.userId !== userId)
          ])
        )
      );
      setPagingByChatId((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([chatId, paging]) => [
            chatId,
            {
              ...paging,
              beforeBuffer: paging.beforeBuffer.filter((message) => message.userId !== userId),
              afterBuffer: paging.afterBuffer.filter((message) => message.userId !== userId)
            }
          ])
        )
      );
      removePinnedUserMessages(userId);
      setMentionNotifications((prev) =>
        prev.filter((item) => item.messageUserId !== userId)
      );
      await refreshPinnedForActiveChat().catch(() => undefined);
    },
    [
      refreshPinnedForActiveChat,
      removePinnedUserMessages,
      setMessagesByChatId,
      setPagingByChatId
    ]
  );

  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    settingsModalTab,
    setSettingsModalTab,
    settingsUsersSearch,
    setSettingsUsersSearch,
    filteredSettingsUsers,
    settingsInviteGenerating,
    settingsRoleEditorOpen,
    settingsRoleEditorMode,
    settingsRoleEditorDraft,
    setSettingsRoleEditorDraft,
    settingsRoleColorMenuOpen,
    setSettingsRoleColorMenuOpen,
    settingsDeleteSubmitting,
    settingsDeleteUserTarget,
    settingsEditUserTarget,
    settingsEditUserName,
    setSettingsEditUserName,
    settingsInviteCode,
    settingsInviteLabel,
    openSettingsModal,
    openSettingsEditRole,
    openSettingsRoleInvite,
    openSettingsUserDelete,
    openSettingsUserEdit,
    openOwnUserEdit,
    openSettingsUserInvite,
    openSettingsAddRole,
    closeSettingsRoleEditor,
    saveSettingsRole,
    closeSettingsUserDelete,
    confirmSettingsUserDelete,
    closeSettingsUserEdit,
    saveSettingsUserEdit,
    closeSettingsInviteCode,
    refreshSettingsInviteCode
  } = usePrototypeSettingsRuntime({
    ownUser: ownUser
      ? {
          id: ownUser.id,
          name: ownUser.name,
          roleIds: (ownUser.roleIds ?? []) as number[],
          avatar: ownUser.avatar,
          bannerColor: ownUser.bannerColor,
          bio: ownUser.bio
        }
      : null,
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      roleIds: (contact.roleIds ?? []) as number[]
    })),
    onDeleteUserLocal: handleLocalDeletedUser,
    settingsPermissions,
    canManageUsersStrict,
    currentUserRank,
    currentUserLocalRole,
    settingsRoles,
    setSettingsRoles,
    serverRoles,
    getHighestLocalRole,
    findServerRoleByLocalName
  });

  const { composerEditor, composerSymbolCount, composerLineCount } = usePrototypeComposerEditor({
    activeChatId,
    draftHtml,
    draftHtmlByChatId,
    setDraftForChat,
    submitMessageRef,
    activeQuote,
    clearActiveQuote: () => setActiveQuote(null),
    emojiByShortcode,
    mentionUsers: [
      ...(ownUser ? [ownUser] : []),
      ...contacts.filter((contact) => contact.id !== ownUser?.id)
    ]
  });
  const { typingIndicatorText } = usePrototypeTyping({
    ownUserId: ownUser?.id,
    activeChatId: activeChat?.id ?? null,
    composerEditor,
    draftHtml,
    contacts: contacts.map((user) => ({ id: user.id, name: user.name })),
    mainGroupChannelId,
    groupChannelByChatId,
    dmChannelByChatIdRef
  });

  const isComposerSymbolOverflow = composerSymbolCount > roleMessageCharsLimit;
  const isComposerLineOverflow = composerLineCount > roleMessageLinesLimit;

  const openMessageReactionPicker = useCallback(
    (messageId: number, anchor: { x: number; y: number }) => {
      const PICKER_WIDTH = 360;
      const PICKER_HEIGHT = 408;
      const x = Math.max(8, Math.min(anchor.x, window.innerWidth - PICKER_WIDTH - 8));
      const y = Math.max(8, Math.min(anchor.y, window.innerHeight - PICKER_HEIGHT - 8));
      setMessageReactionPicker({ messageId, x, y });
    },
    []
  );

  const closeMessageReactionPicker = useCallback(() => {
    setMessageReactionPicker(null);
  }, []);

  const toggleMessageReaction = useCallback(async (messageId: number, emoji: string) => {
    try {
      await getTRPCClient().messages.toggleReaction.mutate({
        messageId,
        emoji
      });
    } catch {
      toast.error('Не удалось изменить реакцию.');
    }
  }, []);

  const handleSelectMessageReaction = useCallback(
    (messageId: number, emoji: TEmojiItem) => {
      const reactionEmoji = emoji.shortcodes[0] ?? emoji.name;
      if (!reactionEmoji) return;
      addRecentEmoji(emoji);
      closeMessageReactionPicker();
      void toggleMessageReaction(messageId, reactionEmoji);
    },
    [addRecentEmoji, closeMessageReactionPicker, toggleMessageReaction]
  );

  const { onMessageMenuAction } = usePrototypeMessageActions({
    messageContextMenu,
    closeMessageContextMenu,
    openMessageReactionPicker,
    composerEditor,
    setActiveQuote,
    setMessagesByChatId,
    ownUserId: ownUser?.id,
    activeChatId: activeChat?.id ?? null,
    isPinnedPopoverOpen,
    refreshPinnedForActiveChat
  });
  const {
    chatBodyRef,
    showScrollToBottom,
    jumpHighlightedMessageId,
    consumeVisibleUnreadForChat,
    scheduleScrollToBottom,
    scheduleOwnSendScroll,
    openPinnedMessageInChat,
    handleChatScroll,
    handleScrollToBottomClick
  } = usePrototypeChatScroll({
    activeChatId: activeChat?.id ?? null,
    ownUserId: ownUser?.id,
    visibleMessagesLength: visibleMessages.length,
    messagesByChatId,
    setMessagesByChatId,
    messagesByChatIdRef,
    setPagingByChatId,
    pagingByChatIdRef,
    unreadMessageIdsByChatIdRef,
    serverUnreadByChatId,
    serverUnreadDismissedByChatId,
    setServerUnreadDismissedByChatId,
    addUnreadMessageIds,
    removeUnreadMessageIds,
    isMessageContextMenuOpen: Boolean(messageContextMenu),
    closeMessageContextMenu,
    loadCurrentWindowForChat,
    loadOlderWindowForChat,
    loadNewerWindowForChat,
    getHasMoreAfter,
    getLoadedChannelIdForChat: (chatId) =>
      chatId === MAIN_GROUP_CHAT_ID
        ? mainGroupChannelId
        : groupChannelByChatId[chatId] ?? dmChannelByChatId[chatId] ?? null,
    resolveChannelIdForChat,
    mapRawMessagesToAsc
  });

  const openMentionNotification = useCallback(
    async (notification: TMentionNotification) => {
      setIsMentionPopoverOpen(false);
      removeMentionNotification(notification.messageId);

      if (activeChat?.id === notification.chatId) {
        await openPinnedMessageInChat(notification.messageId);
        return;
      }

      setPendingMentionJump({
        chatId: notification.chatId,
        messageId: notification.messageId
      });
      setActiveChatId(notification.chatId);
    },
    [
      activeChat?.id,
      openPinnedMessageInChat,
      removeMentionNotification,
      setActiveChatId
    ]
  );

  const showDesktopMessageNotification = useCallback(
    ({
      chatId,
      author,
      text,
      isMention
    }: {
      chatId: string;
      author: string;
      text: string;
      isMention: boolean;
    }) => {
      if (!isDesktopBridgeAvailable()) return;

      const appInForeground =
        document.visibilityState === 'visible' && document.hasFocus();
      const isActiveChatMessage = activeChatId === chatId;

      if (appInForeground && isActiveChatMessage) {
        return;
      }

      const title = isMention ? `Упоминание от ${author}` : `Новое сообщение от ${author}`;
      const messageText = text.trim() || '[вложение]';

      showDesktopNotification(title, messageText, { chatId });
    },
    [activeChatId]
  );

  useEffect(() => {
    if (!isDesktopBridgeAvailable()) return;

    const totalUnread =
      contacts.reduce((sum, user) => sum + getUnreadCountForChat(`contact-${user.id}`), 0) +
      getUnreadCountForChat(MAIN_GROUP_CHAT_ID) +
      groupChannels.reduce((sum, channel) => sum + getUnreadCountForChat(getGroupChatId(channel.id)), 0);

    setDesktopUnreadCount(totalUnread);
  }, [contacts, getUnreadCountForChat, groupChannels]);

  useEffect(() => {
    if (!pendingMentionJump) return;
    if (activeChat?.id !== pendingMentionJump.chatId) return;

    void openPinnedMessageInChat(pendingMentionJump.messageId).finally(() => {
      setPendingMentionJump((current) =>
        current?.messageId === pendingMentionJump.messageId ? null : current
      );
    });
  }, [activeChat?.id, openPinnedMessageInChat, pendingMentionJump]);

  useEffect(() => {
    if (messageContextMenu) {
      setMessageReactionPicker(null);
    }
  }, [messageContextMenu]);

  useEffect(() => {
    setMessageReactionPicker(null);
  }, [activeChat?.id]);

  usePrototypeMessageRealtime({
    ownUserId: ownUser?.id,
    activeChatId: activeChat?.id ?? null,
    mainGroupChannelId,
    getChatIdByChannelId,
    refreshDmConversations,
    mapRawMessagesToAsc,
    setMessagesByChatId,
    addUnreadMessageIds,
    removeUnreadMessageIds,
    setServerUnreadDismissedByChatId,
    consumeVisibleUnreadForChat,
    scheduleScrollToBottom,
    upsertMentionNotification,
    removeMentionNotification,
    showDesktopMessageNotification
  });

  const handleSuccessfulOwnSendToChat = useCallback(
    async (chatId: string, channelId: number) => {
      setActiveQuote(null);
      scheduleOwnSendScroll(chatId);
      await loadCurrentWindowForChat(chatId, channelId);
      void refreshDmConversations();
    },
    [loadCurrentWindowForChat, refreshDmConversations, scheduleOwnSendScroll]
  );

  const {
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
  } = usePrototypeAttachments({
    activeChatId: activeChat?.id ?? null,
    publicStorageMaxFilesPerMessage: publicSettings?.storageMaxFilesPerMessage,
    roleFilesPerMessageLimit,
    roleAllowedFileExtensions,
    roleAllowedFileFormatsLabel,
    roleFileSizeBytesLimit,
    resolveChannelIdForChat,
    onSuccessfulSendToChat: handleSuccessfulOwnSendToChat,
    handleSendActionError
  });
  const { submitMessage, submitGifMessage, insertEmojiShortcode } =
    usePrototypeComposerActions({
      activeChatId: activeChat?.id ?? null,
      resolveChannelIdForChat,
      composerEditor,
      draftHtml,
      activeQuote,
      isComposerSymbolOverflow,
      isComposerLineOverflow,
      setIsEmojiPickerOpen,
      setIsComposerExpanded,
      clearDraftForChat,
      handleSuccessfulOwnSendToChat,
      handleSendActionError,
      addRecentEmoji,
      addRecentGif
    });

  useEffect(() => {
    setActiveQuote(null);
  }, [activeChatId]);

  useEffect(() => {
    if (!isComposerExpanded) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (composerInputWrapRef.current?.contains(target)) {
        return;
      }

      setIsComposerExpanded(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isComposerExpanded]);

  useEffect(() => {
    submitMessageRef.current = () => {
      void submitMessage();
    };
  }, [submitMessage]);

  return (
    <div className="cmx-root">
      <div className="cmx-layout">
        <PrototypeSidebar
          activeTab={activeTab}
          contactsHasUnread={contactsHasUnread}
          groupsHasUnread={groupsHasUnread}
          setActiveTab={setActiveTab}
          setActiveChatId={setActiveChatId}
          entitySearch={entitySearch}
          setEntitySearch={setEntitySearch}
          messageSearch={messageSearch}
          setMessageSearch={setMessageSearch}
          filteredChats={filteredChats}
          activeChatId={activeChatId}
          ownUserName={ownUser?.name || 'Пользователь'}
          ownUserStatus={getStatusText(String(ownUser?.status))}
          ownUserAvatar={ownUser?.avatar ?? null}
          canViewSettings={settingsPermissions.canViewSettings}
          canEditOwnProfile={Boolean(ownUser?.id)}
          openOwnUserEdit={openOwnUserEdit}
          isMentionPopoverOpen={isMentionPopoverOpen}
          setIsMentionPopoverOpen={setIsMentionPopoverOpen}
          mentionNotifications={mentionNotifications}
          openMentionNotification={openMentionNotification}
          onLogout={handleLogout}
          openSettingsModal={openSettingsModal}
          canManageGroups={settingsPermissions.canManageGroups}
          openCreateGroup={openCreateGroup}
          openEditGroup={openEditGroup}
          deleteGroup={deleteGroupByChatId}
        />

        <PrototypeChatPanel
          activeChat={activeChat}
          typingIndicatorText={typingIndicatorText}
          isComposerSymbolOverflow={isComposerSymbolOverflow}
          composerSymbolCount={composerSymbolCount}
          roleMessageCharsLimit={roleMessageCharsLimit}
          isComposerLineOverflow={isComposerLineOverflow}
          composerLineCount={composerLineCount}
          roleMessageLinesLimit={roleMessageLinesLimit}
          canUseVoiceCalls={canUseVoiceCalls}
          canUseVideoCalls={canUseVideoCalls}
          canUseRemoteDesktop={canUseRemoteDesktop}
          isNotesChat={isNotesChat}
          setIsPinnedPopoverOpen={setIsPinnedPopoverOpen}
          isPinnedPopoverOpen={isPinnedPopoverOpen}
          pinnedLoading={pinnedLoading}
          pinnedMessages={pinnedMessages}
          openPinnedMessageInChat={(messageId) =>
            openPinnedMessageInChat(messageId, () => setIsPinnedPopoverOpen(false))
          }
          chatBodyRef={chatBodyRef}
          onChatDragEnter={onChatDragEnter}
          handleChatScroll={handleChatScroll}
          onChatDragOver={onChatDragOver}
          onChatDragLeave={onChatDragLeave}
          onChatDrop={onChatDrop}
          onChatPaste={onChatPaste}
          visibleMessages={visibleMessages}
          renderMessages={renderMessages}
          messageContextMenu={messageContextMenu}
          jumpHighlightedMessageId={jumpHighlightedMessageId}
          handleMessageContextMenu={handleMessageContextMenu}
          onMessageCopy={onMessageCopy}
          renderMessageContent={renderMessageContent}
          openImageViewer={openImageViewer}
          downloadFileWithPrompt={downloadFileWithPrompt}
          closeMessageContextMenu={closeMessageContextMenu}
          onMessageMenuAction={onMessageMenuAction}
          ownUserId={ownUser?.id}
          toggleMessageReaction={toggleMessageReaction}
          openMessageReactionPicker={openMessageReactionPicker}
          messageReactionPicker={messageReactionPicker}
          closeMessageReactionPicker={closeMessageReactionPicker}
          onSelectMessageReaction={handleSelectMessageReaction}
          topRecentEmojis={topRecentEmojis}
          emojiGroups={emojiGroups}
          messageContextMenuRef={messageContextMenuRef}
          isDragOverlayVisible={isDragOverlayVisible}
          showScrollToBottom={showScrollToBottom}
          handleScrollToBottomClick={handleScrollToBottomClick}
          imageViewerFile={imageViewerFile}
          closeImageViewer={closeImageViewer}
          imageViewerStageRef={imageViewerStageRef}
          imageViewerZoom={imageViewerZoom}
          isImageViewerPanning={isImageViewerPanning}
          onImageViewerWheel={onImageViewerWheel}
          onImageViewerPointerDown={onImageViewerPointerDown}
          onImageViewerPointerMove={onImageViewerPointerMove}
          onImageViewerPointerUp={onImageViewerPointerUp}
          onImageViewerLostPointerCapture={onImageViewerLostPointerCapture}
          imageViewerPan={imageViewerPan}
        />

        <PrototypeComposer
          draftHtml={draftHtml}
          submitMessage={submitMessage}
          activeQuote={activeQuote}
          clearActiveQuote={() => setActiveQuote(null)}
          composerInputWrapRef={composerInputWrapRef}
          isComposerExpanded={isComposerExpanded}
          setIsComposerExpanded={setIsComposerExpanded}
          composerEditor={composerEditor}
          emojiButtonRef={emojiButtonRef}
          isEmojiPickerOpen={isEmojiPickerOpen}
          setIsEmojiPickerOpen={setIsEmojiPickerOpen}
          emojiPopoverRef={emojiPopoverRef}
          emojiPanelTab={emojiPanelTab}
          setEmojiPanelTab={setEmojiPanelTab}
          topRecentEmojis={topRecentEmojis}
          emojiGroups={emojiGroups}
          insertEmojiShortcode={insertEmojiShortcode}
          gifSearch={gifSearch}
          setGifSearch={setGifSearch}
          gifLoading={gifLoading}
          gifLoadFailed={gifLoadFailed}
          gifItems={gifItems}
          submitGifMessage={submitGifMessage}
          openAttachModal={openAttachModal}
          uploading={uploading}
          isAttachModalOpen={isAttachModalOpen}
          attachModalFiles={attachModalFiles}
          openModalFileDialog={openModalFileDialog}
          attachModalUploading={attachModalUploading}
          attachModalSending={attachModalSending}
          attachModalUploadingSize={attachModalUploadingSize}
          removeAttachModalFile={removeAttachModalFile}
          attachModalComment={attachModalComment}
          setAttachModalComment={setAttachModalComment}
          closeAttachModal={closeAttachModal}
          submitAttachModal={submitAttachModal}
          modalFileInputRef={modalFileInputRef}
          onModalFileInputChange={onModalFileInputChange}
        />
        <PrototypeSettingsModal
          isSettingsModalOpen={isSettingsModalOpen}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
          settingsModalTab={settingsModalTab}
          setSettingsModalTab={setSettingsModalTab}
          visibleSettingsRoles={visibleSettingsRoles}
          settingsPermissions={settingsPermissions}
          openSettingsEditRole={openSettingsEditRole}
          openSettingsRoleInvite={openSettingsRoleInvite}
          settingsInviteGenerating={settingsInviteGenerating}
          canManageUsersStrict={canManageUsersStrict}
          filteredSettingsUsers={filteredSettingsUsers}
          settingsUsersSearch={settingsUsersSearch}
          setSettingsUsersSearch={setSettingsUsersSearch}
          openSettingsUserDelete={openSettingsUserDelete}
          openSettingsUserEdit={openSettingsUserEdit}
          openSettingsUserInvite={openSettingsUserInvite}
          openSettingsAddRole={openSettingsAddRole}
          settingsRoleEditorOpen={settingsRoleEditorOpen}
          settingsRoleEditorMode={settingsRoleEditorMode}
          closeSettingsRoleEditor={closeSettingsRoleEditor}
          settingsRoleEditorDraft={settingsRoleEditorDraft}
          setSettingsRoleEditorDraft={setSettingsRoleEditorDraft}
          settingsRoleColorMenuOpen={settingsRoleColorMenuOpen}
          setSettingsRoleColorMenuOpen={setSettingsRoleColorMenuOpen}
          currentUserRank={currentUserRank}
          saveSettingsRole={saveSettingsRole}
          settingsDeleteUserTarget={settingsDeleteUserTarget}
          settingsDeleteSubmitting={settingsDeleteSubmitting}
          closeSettingsUserDelete={closeSettingsUserDelete}
          confirmSettingsUserDelete={confirmSettingsUserDelete}
          settingsEditUserTarget={settingsEditUserTarget}
          closeSettingsUserEdit={closeSettingsUserEdit}
          settingsEditUserName={settingsEditUserName}
          setSettingsEditUserName={setSettingsEditUserName}
          settingsEditOwnAvatar={
            settingsEditUserTarget?.id === ownUser?.id ? (ownUser?.avatar ?? null) : null
          }
          settingsEditUserIsOwn={settingsEditUserTarget?.id === ownUser?.id}
          saveSettingsUserEdit={saveSettingsUserEdit}
          settingsInviteCode={settingsInviteCode}
          closeSettingsInviteCode={closeSettingsInviteCode}
          settingsInviteLabel={settingsInviteLabel}
          refreshSettingsInviteCode={refreshSettingsInviteCode}
        />
        <PrototypeGroupEditorModal
          isOpen={groupEditorOpen}
          mode={groupEditorMode}
          group={groupEditorTarget}
          filterOptions={groupFilterOptions}
          lockedFilter={lockedGroupFilter}
          submitting={groupEditorSubmitting}
          onClose={closeGroupEditor}
          onCreate={createGroup}
          onUpdate={updateGroup}
        />
      </div>
    </div>
  );
});

export { PrototypeInterface };
