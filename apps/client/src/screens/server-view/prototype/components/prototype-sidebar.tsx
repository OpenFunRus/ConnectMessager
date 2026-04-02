import { useEffect, useState } from 'react';
import { Icon } from './icon';
import { RelativeTime } from '@/components/relative-time';
import type { TFile } from '@connectmessager/shared';
import type { TChat, TMentionNotification } from '../types';
import { MAIN_GROUP_CHAT_ID, NOTES_CHAT_ID } from '../constants';
import { getInitials } from '../utils';
import { getFileUrl } from '@/helpers/get-file-url';

type TPrototypeSidebarProps = {
  activeTab: 'contacts' | 'groups';
  contactsHasUnread: boolean;
  groupsHasUnread: boolean;
  setActiveTab: (tab: 'contacts' | 'groups') => void;
  setActiveChatId: (chatId: string) => void;
  entitySearch: string;
  setEntitySearch: (value: string) => void;
  messageSearch: string;
  setMessageSearch: (value: string) => void;
  filteredChats: TChat[];
  activeChatId: string | null;
  ownUserName: string;
  ownUserStatus: string;
  ownUserAvatar: TFile | null;
  canViewSettings: boolean;
  canEditOwnProfile: boolean;
  openOwnUserEdit: () => void;
  isMentionPopoverOpen: boolean;
  setIsMentionPopoverOpen: (value: boolean) => void;
  mentionNotifications: TMentionNotification[];
  openMentionNotification: (notification: TMentionNotification) => Promise<void>;
  onLogout: () => Promise<void>;
  openSettingsModal: () => void;
  canManageGroups: boolean;
  openCreateGroup: () => void;
  openEditGroup: (chatId: string) => void;
  deleteGroup: (chatId: string) => void;
};

const PrototypeSidebar = ({
  activeTab,
  contactsHasUnread,
  groupsHasUnread,
  setActiveTab,
  setActiveChatId,
  entitySearch,
  setEntitySearch,
  messageSearch,
  setMessageSearch,
  filteredChats,
  activeChatId,
  ownUserName,
  ownUserStatus,
  ownUserAvatar,
  canViewSettings,
  canEditOwnProfile,
  openOwnUserEdit,
  isMentionPopoverOpen,
  setIsMentionPopoverOpen,
  mentionNotifications,
  openMentionNotification,
  onLogout,
  openSettingsModal,
  canManageGroups,
  openCreateGroup,
  openEditGroup,
  deleteGroup
}: TPrototypeSidebarProps) => {
  const [groupContextMenu, setGroupContextMenu] = useState<{
    chatId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!groupContextMenu) return;

    const closeMenu = () => setGroupContextMenu(null);
    document.addEventListener('mousedown', closeMenu);
    window.addEventListener('blur', closeMenu);

    return () => {
      document.removeEventListener('mousedown', closeMenu);
      window.removeEventListener('blur', closeMenu);
    };
  }, [groupContextMenu]);

  return (
    <>
      <header className="cmx-tabs" aria-label="Меню разделов">
        <button
          className={`cmx-tab ${activeTab === 'contacts' ? 'active' : ''} ${contactsHasUnread ? 'has-unread' : ''}`}
          type="button"
          onClick={() => {
            setActiveTab('contacts');
            setActiveChatId(NOTES_CHAT_ID);
          }}
          aria-label="Контакты"
          title="Контакты"
        >
          <Icon name="user" className="cmx-icon-tab" />
        </button>
        <button
          className={`cmx-tab ${activeTab === 'groups' ? 'active' : ''} ${groupsHasUnread ? 'has-unread' : ''}`}
          type="button"
          onClick={() => {
            setActiveTab('groups');
            setActiveChatId(MAIN_GROUP_CHAT_ID);
          }}
          aria-label="Группы"
          title="Группы"
        >
          <Icon name="users-group" className="cmx-icon-tab" />
        </button>
        <button className="cmx-tab disabled" type="button" aria-label="Боты" title="Боты" disabled>
          <Icon name="robot" className="cmx-icon-tab" />
        </button>
        <button className="cmx-tab disabled" type="button" aria-label="Другое" title="Другое" disabled>
          <Icon name="dots" className="cmx-icon-tab" />
        </button>
      </header>

      <header className="cmx-service" aria-label="Служебное меню">
        <div className="cmx-service-brand">
          <Icon name="messages" className="cmx-icon-brand" />
          <div>
            <div className="cmx-service-title">Мессенджер Коннект</div>
            <div className="cmx-service-version">версия 0.0.0.1</div>
          </div>
        </div>
        <div className="cmx-service-actions">
          <div className="cmx-service-action-wrap">
            <button
              className="cmx-icon-btn cmx-icon-btn-bell"
              type="button"
              title="Уведомления"
              aria-label="Уведомления"
              onClick={() => setIsMentionPopoverOpen(!isMentionPopoverOpen)}
            >
              {mentionNotifications.length > 0 && (
                <span className="cmx-icon-btn-dot" aria-hidden="true" />
              )}
              <Icon name="bell" className="cmx-icon-btn-inner" />
            </button>
            {isMentionPopoverOpen && (
              <>
                <button
                  type="button"
                  className="cmx-popover-backdrop"
                  aria-label="Закрыть уведомления"
                  onClick={() => setIsMentionPopoverOpen(false)}
                />
                <div className="cmx-service-popover cmx-pinned-popover">
                  <div className="cmx-pinned-popover-header">
                    <span>Упоминания</span>
                    <button
                      type="button"
                      className="cmx-pinned-popover-close"
                      onClick={() => setIsMentionPopoverOpen(false)}
                      title="Закрыть"
                    >
                      <Icon name="x" className="cmx-icon-btn-inner" />
                    </button>
                  </div>
                  <div className="cmx-pinned-popover-body">
                    {mentionNotifications.length === 0 ? (
                      <div className="cmx-pinned-popover-state">Нет новых упоминаний</div>
                    ) : (
                      mentionNotifications.map((notification) => (
                        <button
                          key={`mention-${notification.messageId}`}
                          type="button"
                          className="cmx-pinned-item cmx-mention-item"
                          onClick={() => {
                            void openMentionNotification(notification);
                          }}
                        >
                          <div className="cmx-pinned-item-head">
                            <div className="cmx-pinned-item-author">{notification.author}</div>
                            <RelativeTime date={new Date(notification.createdAt)}>
                              {(relativeTime) => <span className="cmx-pinned-time">{relativeTime}</span>}
                            </RelativeTime>
                          </div>
                          <div className="cmx-pinned-item-text">
                            {notification.text || '[вложение или упоминание]'}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {canViewSettings && (
            <button
              className="cmx-icon-btn"
              type="button"
              title="Служебные настройки"
              aria-label="Служебные настройки"
              onClick={openSettingsModal}
            >
              <Icon name="settings" className="cmx-icon-btn-inner" />
            </button>
          )}
          <button
            className="cmx-icon-btn cmx-icon-btn-logout"
            type="button"
            title="Выйти из аккаунта"
            aria-label="Выйти из аккаунта"
            onClick={() => {
              void onLogout();
            }}
          >
            <Icon name="logout" className="cmx-icon-btn-inner" />
          </button>
        </div>
      </header>

      <section className="cmx-search-left">
        <input
          className="cmx-input"
          value={entitySearch}
          onChange={(event) => setEntitySearch(event.target.value)}
          placeholder="Поиск по контактам и группам..."
        />
      </section>

      <section className="cmx-search-right">
        <input
          className="cmx-input"
          value={messageSearch}
          onChange={(event) => setMessageSearch(event.target.value)}
          placeholder="Поиск по чату..."
        />
      </section>

      <aside className="cmx-entities">
        {activeTab === 'groups' && canManageGroups && (
          <button
            type="button"
            className="cmx-group-create-btn"
            onClick={openCreateGroup}
            title="Создать группу"
          >
            <span>Создать группу</span>
          </button>
        )}
        <div className="cmx-entity-list">
          {filteredChats.map((chat) => (
            <div key={chat.id} className="cmx-entity-row">
              <button
                className={`cmx-entity-item ${activeChatId === chat.id ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveChatId(chat.id)}
                onContextMenu={(event) => {
                  if (chat.type !== 'groups' || chat.isMainGroup || !chat.canManage) {
                    return;
                  }
                  event.preventDefault();
                  const menuWidth = 190;
                  const menuHeight = 92;
                  setGroupContextMenu({
                    chatId: chat.id,
                    x: Math.min(event.clientX, window.innerWidth - menuWidth - 12),
                    y: Math.min(event.clientY, window.innerHeight - menuHeight - 12)
                  });
                }}
              >
                <div className="cmx-entity-main">
                  <div
                    className={`cmx-avatar ${chat.id === NOTES_CHAT_ID || chat.id === MAIN_GROUP_CHAT_ID ? 'cmx-avatar-notes' : ''}`}
                  >
                    {chat.id === NOTES_CHAT_ID || chat.id === MAIN_GROUP_CHAT_ID ? (
                      <img
                        className="cmx-avatar-icon"
                        src={chat.id === MAIN_GROUP_CHAT_ID ? '/icons/tabler/messages.svg' : '/icons/tabler/notes.svg'}
                        alt=""
                        aria-hidden="true"
                      />
                    ) : chat.avatar ? (
                      <img className="cmx-avatar-image" src={getFileUrl(chat.avatar)} alt="" />
                    ) : (
                      getInitials(chat.title)
                    )}
                  </div>
                  <div className="cmx-entity-text">
                    <div className="cmx-entity-title">{chat.title}</div>
                    <div className="cmx-entity-sub">{chat.status}</div>
                  </div>
                  {chat.unread > 0 && <span className="cmx-unread">{chat.unread}</span>}
                </div>
              </button>
            </div>
          ))}
        </div>
        {groupContextMenu && (
          <>
            <button
              type="button"
              className="cmx-popover-backdrop"
              aria-label="Закрыть меню группы"
              onClick={() => setGroupContextMenu(null)}
            />
            <div
              className="cmx-group-context-menu"
              style={{
                left: groupContextMenu.x,
                top: groupContextMenu.y
              }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="cmx-group-context-menu-item"
                onClick={() => {
                  openEditGroup(groupContextMenu.chatId);
                  setGroupContextMenu(null);
                }}
              >
                <Icon name="pencil" className="cmx-icon-btn-inner" />
                <span>Редактировать</span>
              </button>
              <button
                type="button"
                className="cmx-group-context-menu-item danger"
                onClick={() => {
                  deleteGroup(groupContextMenu.chatId);
                  setGroupContextMenu(null);
                }}
              >
                <Icon name="ban" className="cmx-icon-btn-inner" />
                <span>Удалить</span>
              </button>
            </div>
          </>
        )}
      </aside>

      <footer className="cmx-user">
        <div className="cmx-user-card">
          <div className="cmx-user-main">
            <div className="cmx-avatar">
              {ownUserAvatar ? (
                <img className="cmx-avatar-image" src={getFileUrl(ownUserAvatar)} alt="" />
              ) : (
                getInitials(ownUserName || 'Вы')
              )}
            </div>
            <div>
              <div className="cmx-user-name">{ownUserName || 'Пользователь'}</div>
              <div className="cmx-user-status">{ownUserStatus}</div>
            </div>
          </div>
          {canEditOwnProfile && (
            <button
              className="cmx-icon-btn"
              type="button"
              title="Редактировать профиль"
              aria-label="Редактировать профиль"
              onClick={openOwnUserEdit}
            >
              <Icon name="pencil" className="cmx-icon-btn-inner" />
            </button>
          )}
        </div>
      </footer>
    </>
  );
};

export { PrototypeSidebar };
