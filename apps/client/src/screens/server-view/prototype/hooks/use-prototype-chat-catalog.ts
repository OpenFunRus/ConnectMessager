import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { MAIN_GROUP_CHAT_ID, NOTES_CHAT_ID, notesChat } from '../constants';
import type { TChat, TSettingsRole } from '../types';
import {
  canManageGroupWithFilter,
  canRolesSeeEachOther,
  getGroupChatId,
  getStatusText
} from '../utils';
import type { TFile } from '@connectmessager/shared';

type TCatalogContact = {
  id: number;
  name: string;
  status?: string | null;
  roleIds?: number[];
  avatar?: TFile | null;
};

type TUsePrototypeChatCatalogParams = {
  infoName?: string | null;
  contacts: TCatalogContact[];
  groupChannels: Array<{
    id: number;
    name: string;
    groupDescription?: string | null;
    groupFilter?: string | null;
    groupAvatar?: TFile | null;
  }>;
  activeTab: 'contacts' | 'groups';
  entitySearch: string;
  activeChatId: string | null;
  currentUserLocalRole: TSettingsRole | null;
  getHighestLocalRole: (roleIds: number[]) => TSettingsRole | null;
  getUnreadCountForChat: (chatId: string) => number;
  setActiveChatId: (chatId: string | null) => void;
  setActiveTab: (tab: 'contacts' | 'groups') => void;
  canManageGroups: boolean;
};

const usePrototypeChatCatalog = ({
  infoName,
  contacts,
  groupChannels,
  activeTab,
  entitySearch,
  activeChatId,
  currentUserLocalRole,
  getHighestLocalRole,
  getUnreadCountForChat,
  setActiveChatId,
  setActiveTab,
  canManageGroups
}: TUsePrototypeChatCatalogParams) => {
  const contactChats = useMemo<TChat[]>(
    () =>
      contacts
        .filter((user) =>
          canRolesSeeEachOther(
            currentUserLocalRole,
            getHighestLocalRole((user.roleIds ?? []) as number[])
          )
        )
        .map((user) => ({
          id: `contact-${user.id}`,
          type: 'contacts',
          title: user.name,
          status: getStatusText(String(user.status)),
          unread: getUnreadCountForChat(`contact-${user.id}`),
          avatar: user.avatar ?? null
        })),
    [contacts, currentUserLocalRole, getHighestLocalRole, getUnreadCountForChat]
  );

  const pinnedMainGroupChat = useMemo<TChat>(
    () => ({
      id: MAIN_GROUP_CHAT_ID,
      type: 'groups',
      title: infoName?.trim() || 'Мессенджер Коннект',
      status: 'общая группа',
      unread: getUnreadCountForChat(MAIN_GROUP_CHAT_ID)
    }),
    [getUnreadCountForChat, infoName]
  );

  const groupChats = useMemo<TChat[]>(
    () => [
      { ...pinnedMainGroupChat, isMainGroup: true, channelId: pinnedMainGroupChat.channelId ?? null },
      ...groupChannels.map((channel) => {
        const chatId = getGroupChatId(channel.id);
        return {
          id: chatId,
          type: 'groups' as const,
          title: channel.name,
          status: channel.groupDescription?.trim() || 'группа',
          unread: getUnreadCountForChat(chatId),
          channelId: channel.id,
          canManage:
            canManageGroups && canManageGroupWithFilter(currentUserLocalRole, channel.groupFilter),
          avatar: channel.groupAvatar ?? null
        };
      })
    ],
    [canManageGroups, currentUserLocalRole, getUnreadCountForChat, groupChannels, pinnedMainGroupChat]
  );

  const filteredChats = useMemo(() => {
    const term = entitySearch.trim().toLowerCase();
    const byTab = activeTab === 'contacts' ? contactChats : groupChats;

    if (activeTab === 'contacts') {
      const filteredContacts = term
        ? byTab.filter((chat) => chat.title.toLowerCase().includes(term))
        : byTab;
      return [notesChat, ...filteredContacts];
    }

    const nonPinnedGroups = byTab.filter((chat) => !chat.isMainGroup);
    const filteredGroups = term
      ? nonPinnedGroups.filter((chat) => chat.title.toLowerCase().includes(term))
      : nonPinnedGroups;

    return [groupChats[0]!, ...filteredGroups];
  }, [activeTab, contactChats, entitySearch, groupChats]);

  const activeChat = useMemo(
    () =>
      [notesChat, ...contactChats, ...groupChats].find(
        (chat) => chat.id === activeChatId
      ) || null,
    [activeChatId, contactChats, groupChats]
  );

  useEffect(() => {
    if (!activeChatId) return;
    if (activeChatId === NOTES_CHAT_ID || activeChatId === MAIN_GROUP_CHAT_ID) return;

    const chatStillVisible = [...contactChats, ...groupChats].some(
      (chat) => chat.id === activeChatId
    );

    if (!chatStillVisible) {
      setActiveChatId(NOTES_CHAT_ID);
      setActiveTab('contacts');
      toast.error('Чат закрыт: пользователь или группа больше недоступны по текущему фильтру.');
    }
  }, [activeChatId, contactChats, groupChats, setActiveChatId, setActiveTab]);

  const contactsHasUnread = contactChats.some((chat) => chat.unread > 0);
  const groupsHasUnread = groupChats.some((chat) => chat.unread > 0);
  const isNotesChat = activeChat?.id === NOTES_CHAT_ID;

  return {
    contactChats,
    groupChats,
    filteredChats,
    activeChat,
    contactsHasUnread,
    groupsHasUnread,
    isNotesChat
  };
};

export { usePrototypeChatCatalog };
