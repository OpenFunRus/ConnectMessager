import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TFile } from '@connectmessager/shared';
import { FILTER_ALL, SETTINGS_ROLE_COLOR_POOL, SETTINGS_ROLE_FILTER_OPTIONS } from '../constants';
import { Icon } from '../components/icon';
import type { TSettingsPermissions, TSettingsRole, TSettingsUser } from '../types';
import { countEnabledRoleLimits, getInitials, normalizeVisibilityFilter } from '../utils';

type TPrototypeSettingsModalProps = {
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: Dispatch<SetStateAction<boolean>>;
  settingsModalTab: 'roles' | 'users';
  setSettingsModalTab: Dispatch<SetStateAction<'roles' | 'users'>>;
  visibleSettingsRoles: TSettingsRole[];
  settingsPermissions: TSettingsPermissions;
  openSettingsEditRole: (role: TSettingsRole) => void;
  openSettingsRoleInvite: (role: TSettingsRole) => Promise<void>;
  settingsInviteGenerating: boolean;
  canManageUsersStrict: boolean;
  filteredSettingsUsers: TSettingsUser[];
  settingsUsersSearch: string;
  setSettingsUsersSearch: Dispatch<SetStateAction<string>>;
  openSettingsUserDelete: (user: TSettingsUser) => void;
  openSettingsUserEdit: (user: TSettingsUser) => void;
  openSettingsUserInvite: (user: TSettingsUser) => Promise<void>;
  openSettingsAddRole: () => void;
  settingsRoleEditorOpen: boolean;
  settingsRoleEditorMode: 'add' | 'edit';
  closeSettingsRoleEditor: () => void;
  settingsRoleEditorDraft: TSettingsRole;
  setSettingsRoleEditorDraft: Dispatch<SetStateAction<TSettingsRole>>;
  settingsRoleColorMenuOpen: boolean;
  setSettingsRoleColorMenuOpen: Dispatch<SetStateAction<boolean>>;
  currentUserRank: number;
  saveSettingsRole: () => void;
  settingsDeleteUserTarget: TSettingsUser | null;
  settingsDeleteSubmitting: boolean;
  closeSettingsUserDelete: () => void;
  confirmSettingsUserDelete: () => void;
  settingsEditUserTarget: TSettingsUser | null;
  closeSettingsUserEdit: () => void;
  settingsEditUserName: string;
  setSettingsEditUserName: Dispatch<SetStateAction<string>>;
  settingsEditOwnAvatar: TFile | null;
  settingsEditUserIsOwn: boolean;
  saveSettingsUserEdit: (payload?: { avatarFile?: File | null; clearAvatar?: boolean }) => void;
  settingsInviteCode: string;
  closeSettingsInviteCode: () => void;
  settingsInviteLabel: string;
  refreshSettingsInviteCode: () => Promise<void>;
};

const PrototypeSettingsModal = ({
  isSettingsModalOpen,
  setIsSettingsModalOpen,
  settingsModalTab,
  setSettingsModalTab,
  visibleSettingsRoles,
  settingsPermissions,
  openSettingsEditRole,
  openSettingsRoleInvite,
  settingsInviteGenerating,
  canManageUsersStrict,
  filteredSettingsUsers,
  settingsUsersSearch,
  setSettingsUsersSearch,
  openSettingsUserDelete,
  openSettingsUserEdit,
  openSettingsUserInvite,
  openSettingsAddRole,
  settingsRoleEditorOpen,
  settingsRoleEditorMode,
  closeSettingsRoleEditor,
  settingsRoleEditorDraft,
  setSettingsRoleEditorDraft,
  settingsRoleColorMenuOpen,
  setSettingsRoleColorMenuOpen,
  currentUserRank,
  saveSettingsRole,
  settingsDeleteUserTarget,
  settingsDeleteSubmitting,
  closeSettingsUserDelete,
  confirmSettingsUserDelete,
  settingsEditUserTarget,
  closeSettingsUserEdit,
  settingsEditUserName,
  setSettingsEditUserName,
  settingsEditOwnAvatar,
  settingsEditUserIsOwn,
  saveSettingsUserEdit,
  settingsInviteCode,
  closeSettingsInviteCode,
  settingsInviteLabel,
  refreshSettingsInviteCode
}: TPrototypeSettingsModalProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [clearAvatar, setClearAvatar] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setClearAvatar(false);
  }, [settingsEditUserIsOwn, settingsEditUserTarget?.id]);

  const currentAvatarPreview = useMemo(() => {
    if (avatarPreviewUrl) return avatarPreviewUrl;
    if (settingsEditUserIsOwn && !clearAvatar && settingsEditOwnAvatar) {
      return getFileUrl(settingsEditOwnAvatar);
    }
    return '';
  }, [avatarPreviewUrl, clearAvatar, settingsEditOwnAvatar, settingsEditUserIsOwn]);

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!nextFile) return;

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setAvatarFile(nextFile);
    setAvatarPreviewUrl(URL.createObjectURL(nextFile));
    setClearAvatar(false);
  };

  const handlePickAvatar = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {isSettingsModalOpen && (
        <div
          className="cmx-settings-modal-overlay"
          role="dialog"
          aria-label="Настройки ролей и пользователей"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsSettingsModalOpen(false);
            }
          }}
        >
          <div className="cmx-settings-modal">
            <div className="cmx-settings-modal-header">
              <div className="cmx-settings-modal-title-wrap">
                <Icon name="settings" className="cmx-icon-btn-inner" />
                <div className="cmx-settings-modal-title">Настройки</div>
              </div>
              <button
                type="button"
                className="cmx-settings-modal-close"
                onClick={() => {
                  setIsSettingsModalOpen(false);
                }}
                title="Закрыть"
                aria-label="Закрыть"
              >
                <Icon name="x" className="cmx-icon-btn-inner" />
              </button>
            </div>
            <div className="cmx-settings-modal-tabs">
              <button
                type="button"
                className={`cmx-settings-modal-tab ${settingsModalTab === 'roles' ? 'active' : ''}`}
                onClick={() => setSettingsModalTab('roles')}
              >
                Роли
              </button>
              <button
                type="button"
                className={`cmx-settings-modal-tab ${settingsModalTab === 'users' ? 'active' : ''}`}
                onClick={() => setSettingsModalTab('users')}
              >
                Пользователи
              </button>
            </div>
            <div className="cmx-settings-modal-body">
              {settingsModalTab === 'roles' ? (
                <div className="cmx-settings-list-wrap">
                  <div className="cmx-settings-list-head">
                    <h4>Список ролей</h4>
                    <span>{visibleSettingsRoles.length} ролей</span>
                  </div>
                  <div className="cmx-settings-roles-list">
                    {[...visibleSettingsRoles]
                      .sort((a, b) => b.rank - a.rank)
                      .map((role) => (
                        <article key={`settings-role-${role.id}`} className="cmx-settings-role-card">
                          <header>
                            <div className="cmx-settings-role-name-wrap">
                              <span
                                className="cmx-settings-role-dot"
                                style={{ background: role.color }}
                              />
                              <strong>{role.name}</strong>
                            </div>
                            <div className="cmx-settings-role-actions">
                              <div className="cmx-settings-role-btn-row">
                                <button
                                  className="cmx-settings-role-rank-btn"
                                  type="button"
                                  style={{ background: role.color }}
                                  title={`Ранг ${role.rank}`}
                                >
                                  {role.rank}
                                </button>
                                {settingsPermissions.canEditRoles && (
                                  <button
                                    className="cmx-settings-role-action-btn"
                                    type="button"
                                    title="Редактировать роль"
                                    onClick={() => {
                                      openSettingsEditRole(role);
                                    }}
                                  >
                                    <Icon name="pencil" className="cmx-icon-btn-inner" />
                                  </button>
                                )}
                                {settingsPermissions.canInviteGroups && (
                                  <button
                                    className="cmx-settings-role-action-btn"
                                    type="button"
                                    title="Сгенерировать код доступа для роли"
                                    onClick={() => {
                                      void openSettingsRoleInvite(role);
                                    }}
                                    disabled={settingsInviteGenerating}
                                  >
                                    <Icon name="key" className="cmx-icon-btn-inner" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </header>
                          <p>{`Фильтр: ${normalizeVisibilityFilter(role)}`}</p>
                          <p className="cmx-settings-role-summary">
                            Ограничений включено: {countEnabledRoleLimits(role)}
                          </p>
                        </article>
                      ))}
                  </div>
                  {settingsPermissions.canAddRoles && (
                    <div className="cmx-settings-role-footer">
                      <button
                        type="button"
                        className="cmx-settings-add-role-btn"
                        onClick={openSettingsAddRole}
                      >
                        Добавить роль
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="cmx-settings-list-wrap">
                  <div className="cmx-settings-list-head">
                    <h4>Пользователи</h4>
                    <span>{filteredSettingsUsers.length} пользователей</span>
                  </div>
                  <input
                    className="cmx-settings-users-search"
                    value={settingsUsersSearch}
                    onChange={(event) => setSettingsUsersSearch(event.target.value)}
                    placeholder="Поиск пользователя по имени..."
                  />
                  {filteredSettingsUsers.length === 0 ? (
                    <div className="cmx-settings-modal-state">Пользователи не найдены.</div>
                  ) : (
                    <div className="cmx-settings-roles-list">
                      {filteredSettingsUsers.map((user) => (
                        <article key={`settings-user-${user.id}`} className="cmx-settings-role-card">
                          <header>
                            <div className="cmx-settings-role-name-wrap">
                              <span
                                className="cmx-settings-role-dot"
                                style={{ background: user.color }}
                              />
                              <strong>{user.name}</strong>
                            </div>
                            <div className="cmx-settings-role-actions">
                              <div className="cmx-settings-role-btn-row cmx-settings-user-btn-row">
                                <button
                                  className="cmx-settings-role-rank-btn"
                                  type="button"
                                  style={{ background: user.color }}
                                  title={`Ранг ${user.rank}`}
                                >
                                  {user.rank}
                                </button>
                                {canManageUsersStrict && (
                                  <button
                                    className="cmx-settings-role-action-btn cmx-settings-ban-btn"
                                    type="button"
                                    title="Удалить пользователя"
                                    onClick={() => {
                                      openSettingsUserDelete(user);
                                    }}
                                  >
                                    <Icon name="ban" className="cmx-icon-btn-inner" />
                                  </button>
                                )}
                                {canManageUsersStrict && (
                                  <button
                                    className="cmx-settings-role-action-btn"
                                    type="button"
                                    title="Редактировать пользователя"
                                    onClick={() => {
                                      openSettingsUserEdit(user);
                                    }}
                                  >
                                    <Icon name="pencil" className="cmx-icon-btn-inner" />
                                  </button>
                                )}
                                {settingsPermissions.canInviteUsers && (
                                  <button
                                    className="cmx-settings-role-action-btn"
                                    type="button"
                                    title="Сгенерировать код входа для пользователя"
                                    onClick={() => {
                                      void openSettingsUserInvite(user);
                                    }}
                                    disabled={settingsInviteGenerating}
                                  >
                                    <Icon name="key" className="cmx-icon-btn-inner" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </header>
                          <p>{user.banned ? 'Пользователь удален' : 'Пользователь активен'}</p>
                          <p className="cmx-settings-role-summary">
                            Ранг и доступы как у связанной роли.
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {settingsRoleEditorOpen && (
        <div
          className="cmx-settings-confirm-overlay"
          role="dialog"
          aria-label={settingsRoleEditorMode === 'add' ? 'Добавить роль' : 'Редактировать роль'}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSettingsRoleEditor();
            }
          }}
        >
          <div className="cmx-settings-confirm-modal cmx-settings-role-editor-modal">
            <div className="cmx-settings-modal-header">
              <div className="cmx-settings-modal-title-wrap">
                <Icon name="pencil" className="cmx-icon-btn-inner" />
                <div className="cmx-settings-modal-title">
                  {settingsRoleEditorMode === 'add' ? 'Добавить роль' : 'Редактировать роль'}
                </div>
              </div>
              <button
                type="button"
                className="cmx-settings-modal-close"
                onClick={closeSettingsRoleEditor}
                title="Закрыть"
              >
                <Icon name="x" className="cmx-icon-btn-inner" />
              </button>
            </div>
            <div className="cmx-settings-confirm-body cmx-settings-role-editor-body">
              <label className="cmx-settings-edit-label">
                <span>Название роли</span>
                <input
                  className="cmx-settings-edit-input"
                  value={settingsRoleEditorDraft.name}
                  onChange={(event) =>
                    setSettingsRoleEditorDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Введите название роли"
                />
              </label>

              <div className="cmx-settings-edit-label">
                <span>Цвет роли</span>
                <button
                  type="button"
                  className="cmx-settings-role-color-toggle"
                  onClick={() => setSettingsRoleColorMenuOpen((prev) => !prev)}
                >
                  <span
                    className="cmx-settings-role-color-toggle-swatch"
                    style={{ background: settingsRoleEditorDraft.color }}
                  />
                  <span>{settingsRoleEditorDraft.color}</span>
                </button>
                {settingsRoleColorMenuOpen && (
                  <div className="cmx-settings-role-color-grid" role="listbox" aria-label="Цвет роли">
                    {SETTINGS_ROLE_COLOR_POOL.map((color) => (
                      <button
                        key={`role-color-${color}`}
                        type="button"
                        className={`cmx-settings-role-color-option ${settingsRoleEditorDraft.color === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => {
                          setSettingsRoleEditorDraft((prev) => ({ ...prev, color }));
                          setSettingsRoleColorMenuOpen(false);
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>

              <label className="cmx-settings-edit-label">
                <span>Ранг роли</span>
                <input
                  className="cmx-settings-edit-input"
                  type="number"
                  min={1}
                  max={currentUserRank}
                  value={settingsRoleEditorDraft.rank}
                  onChange={(event) =>
                    setSettingsRoleEditorDraft((prev) => ({
                      ...prev,
                      rank: Math.max(
                        1,
                        Math.min(currentUserRank, Number(event.target.value) || 1)
                      )
                    }))
                  }
                />
              </label>

              <label className="cmx-settings-edit-label">
                <span>Фильтр</span>
                <select
                  className="cmx-settings-edit-input"
                  value={normalizeVisibilityFilter(settingsRoleEditorDraft)}
                  onChange={(event) =>
                    setSettingsRoleEditorDraft((prev) => ({
                      ...prev,
                      filter: event.target.value,
                      scope: event.target.value === FILTER_ALL ? 'global' : 'filter'
                    }))
                  }
                >
                  {SETTINGS_ROLE_FILTER_OPTIONS.map((item) => (
                    <option key={`role-filter-${item}`} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="cmx-settings-role-editor-group">
                <div className="cmx-settings-role-editor-group-title">Права</div>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.permissions.canViewSettings}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          canViewSettings: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Видеть настройки</span>
                </label>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.permissions.canAddRoles}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          canAddRoles: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Добавлять роли</span>
                </label>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.permissions.canEditRoles}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          canEditRoles: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Редактировать роли</span>
                </label>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.permissions.canManageGroups}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          canManageGroups: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Создание и модерирование групп</span>
                </label>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.permissions.canInviteGroups}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          canInviteGroups: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Генерировать код доступа для роли</span>
                </label>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.permissions.canInviteUsers}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          canInviteUsers: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Генерировать код входа для пользователей</span>
                </label>
              </div>

              <div className="cmx-settings-role-editor-group">
                <div className="cmx-settings-role-editor-group-title">Ограничения</div>

                <div className="cmx-settings-role-editor-limit-row">
                  <label className="cmx-settings-role-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={settingsRoleEditorDraft.limits.messagesPerMinute.enabled}
                      onChange={(event) =>
                        setSettingsRoleEditorDraft((prev) => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            messagesPerMinute: {
                              ...prev.limits.messagesPerMinute,
                              enabled: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Ограничивать сообщения в минуту</span>
                  </label>
                  <input
                    className="cmx-settings-edit-input"
                    type="number"
                    min={1}
                    value={settingsRoleEditorDraft.limits.messagesPerMinute.value}
                    disabled={!settingsRoleEditorDraft.limits.messagesPerMinute.enabled}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        limits: {
                          ...prev.limits,
                          messagesPerMinute: {
                            ...prev.limits.messagesPerMinute,
                            value: Number(event.target.value) || 1
                          }
                        }
                      }))
                    }
                  />
                </div>

                <div className="cmx-settings-role-editor-limit-row">
                  <label className="cmx-settings-role-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={settingsRoleEditorDraft.limits.requestsPerMinute.enabled}
                      onChange={(event) =>
                        setSettingsRoleEditorDraft((prev) => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            requestsPerMinute: {
                              ...prev.limits.requestsPerMinute,
                              enabled: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Ограничивать запросы к серверу</span>
                  </label>
                  <input
                    className="cmx-settings-edit-input"
                    type="number"
                    min={1}
                    value={settingsRoleEditorDraft.limits.requestsPerMinute.value}
                    disabled={!settingsRoleEditorDraft.limits.requestsPerMinute.enabled}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        limits: {
                          ...prev.limits,
                          requestsPerMinute: {
                            ...prev.limits.requestsPerMinute,
                            value: Number(event.target.value) || 1
                          }
                        }
                      }))
                    }
                  />
                </div>

                <div className="cmx-settings-role-editor-limit-row">
                  <label className="cmx-settings-role-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={settingsRoleEditorDraft.limits.charsPerMessage.enabled}
                      onChange={(event) =>
                        setSettingsRoleEditorDraft((prev) => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            charsPerMessage: {
                              ...prev.limits.charsPerMessage,
                              enabled: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Ограничивать символы в сообщении</span>
                  </label>
                  <input
                    className="cmx-settings-edit-input"
                    type="number"
                    min={1}
                    value={settingsRoleEditorDraft.limits.charsPerMessage.value}
                    disabled={!settingsRoleEditorDraft.limits.charsPerMessage.enabled}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        limits: {
                          ...prev.limits,
                          charsPerMessage: {
                            ...prev.limits.charsPerMessage,
                            value: Number(event.target.value) || 1
                          }
                        }
                      }))
                    }
                  />
                </div>

                <div className="cmx-settings-role-editor-limit-row">
                  <label className="cmx-settings-role-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={settingsRoleEditorDraft.limits.linesPerMessage.enabled}
                      onChange={(event) =>
                        setSettingsRoleEditorDraft((prev) => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            linesPerMessage: {
                              ...prev.limits.linesPerMessage,
                              enabled: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Ограничивать строки в сообщении</span>
                  </label>
                  <input
                    className="cmx-settings-edit-input"
                    type="number"
                    min={1}
                    value={settingsRoleEditorDraft.limits.linesPerMessage.value}
                    disabled={!settingsRoleEditorDraft.limits.linesPerMessage.enabled}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        limits: {
                          ...prev.limits,
                          linesPerMessage: {
                            ...prev.limits.linesPerMessage,
                            value: Number(event.target.value) || 1
                          }
                        }
                      }))
                    }
                  />
                </div>

                <div className="cmx-settings-role-editor-limit-row">
                  <label className="cmx-settings-role-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={settingsRoleEditorDraft.limits.fileSizeMb.enabled}
                      onChange={(event) =>
                        setSettingsRoleEditorDraft((prev) => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            fileSizeMb: {
                              ...prev.limits.fileSizeMb,
                              enabled: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Ограничивать размер файлов в сообщении (MB)</span>
                  </label>
                  <input
                    className="cmx-settings-edit-input"
                    type="number"
                    min={1}
                    value={settingsRoleEditorDraft.limits.fileSizeMb.value}
                    disabled={!settingsRoleEditorDraft.limits.fileSizeMb.enabled}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        limits: {
                          ...prev.limits,
                          fileSizeMb: {
                            ...prev.limits.fileSizeMb,
                            value: Number(event.target.value) || 1
                          }
                        }
                      }))
                    }
                  />
                </div>

                <div className="cmx-settings-role-editor-limit-row">
                  <label className="cmx-settings-role-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={settingsRoleEditorDraft.limits.filesPerMessage.enabled}
                      onChange={(event) =>
                        setSettingsRoleEditorDraft((prev) => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            filesPerMessage: {
                              ...prev.limits.filesPerMessage,
                              enabled: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Ограничивать количество файлов в сообщении</span>
                  </label>
                  <input
                    className="cmx-settings-edit-input"
                    type="number"
                    min={1}
                    value={settingsRoleEditorDraft.limits.filesPerMessage.value}
                    disabled={!settingsRoleEditorDraft.limits.filesPerMessage.enabled}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        limits: {
                          ...prev.limits,
                          filesPerMessage: {
                            ...prev.limits.filesPerMessage,
                            value: Number(event.target.value) || 1
                          }
                        }
                      }))
                    }
                  />
                </div>

                <div className="cmx-settings-role-editor-limit-row">
                  <label className="cmx-settings-role-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={settingsRoleEditorDraft.limits.fileFormats.enabled}
                      onChange={(event) =>
                        setSettingsRoleEditorDraft((prev) => ({
                          ...prev,
                          limits: {
                            ...prev.limits,
                            fileFormats: {
                              ...prev.limits.fileFormats,
                              enabled: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Ограничивать формат файлов в сообщении</span>
                  </label>
                  <input
                    className="cmx-settings-edit-input"
                    value={settingsRoleEditorDraft.limits.fileFormats.value}
                    disabled={!settingsRoleEditorDraft.limits.fileFormats.enabled}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        limits: {
                          ...prev.limits,
                          fileFormats: {
                            ...prev.limits.fileFormats,
                            value: event.target.value
                          }
                        }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="cmx-settings-role-editor-group">
                <div className="cmx-settings-role-editor-group-title">Возможности</div>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.abilities.call}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        abilities: {
                          ...prev.abilities,
                          call: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Совершать звонки</span>
                </label>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.abilities.videoCall}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        abilities: {
                          ...prev.abilities,
                          videoCall: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Совершать видеовызовы</span>
                </label>
                <label className="cmx-settings-role-editor-checkbox">
                  <input
                    type="checkbox"
                    checked={settingsRoleEditorDraft.abilities.remoteDesktop}
                    onChange={(event) =>
                      setSettingsRoleEditorDraft((prev) => ({
                        ...prev,
                        abilities: {
                          ...prev.abilities,
                          remoteDesktop: event.target.checked
                        }
                      }))
                    }
                  />
                  <span>Просмотр удаленного рабочего стола</span>
                </label>
              </div>

              <div className="cmx-settings-confirm-actions">
                <button
                  type="button"
                  className="cmx-settings-confirm-cancel"
                  onClick={closeSettingsRoleEditor}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="cmx-settings-add-role-btn"
                  onClick={saveSettingsRole}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsDeleteUserTarget && (
        <div
          className="cmx-settings-confirm-overlay"
          role="dialog"
          aria-label="Подтверждение удаления пользователя"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSettingsUserDelete();
            }
          }}
        >
          <div className="cmx-settings-confirm-modal cmx-settings-invite-modal">
            <div className="cmx-settings-modal-header">
              <div className="cmx-settings-modal-title">Удалить пользователя</div>
              <button
                type="button"
                className="cmx-settings-modal-close"
                onClick={closeSettingsUserDelete}
                title="Закрыть"
              >
                <Icon name="x" className="cmx-icon-btn-inner" />
              </button>
            </div>
            <div className="cmx-settings-confirm-body">
              <p>
                Вы действительно хотите удалить пользователя "{settingsDeleteUserTarget.name}"?
                Это полностью сотрёт учётную запись, сообщения, упоминания, закрепы,
                реакции, GIF/emoji и все файлы пользователя.
              </p>
              <div className="cmx-settings-confirm-actions">
                <button
                  type="button"
                  className="cmx-settings-confirm-cancel"
                  onClick={closeSettingsUserDelete}
                  disabled={settingsDeleteSubmitting}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="cmx-settings-confirm-delete"
                  onClick={confirmSettingsUserDelete}
                  disabled={settingsDeleteSubmitting}
                >
                  {settingsDeleteSubmitting ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsEditUserTarget && (
        <div
          className="cmx-settings-confirm-overlay"
          role="dialog"
          aria-label="Редактирование пользователя"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSettingsUserEdit();
            }
          }}
        >
          <div className="cmx-settings-confirm-modal">
            <div className="cmx-settings-modal-header">
              <div className="cmx-settings-modal-title">Редактировать пользователя</div>
              <button
                type="button"
                className="cmx-settings-modal-close"
                onClick={closeSettingsUserEdit}
                title="Закрыть"
              >
                <Icon name="x" className="cmx-icon-btn-inner" />
              </button>
            </div>
            <div className="cmx-settings-confirm-body">
              <label className="cmx-settings-edit-label">
                <span>Имя пользователя</span>
                <input
                  className="cmx-settings-edit-input"
                  value={settingsEditUserName}
                  onChange={(event) => setSettingsEditUserName(event.target.value)}
                  placeholder="Введите имя"
                />
              </label>
              {settingsEditUserIsOwn && (
                <div className="cmx-settings-edit-label">
                  <span>Аватарка</span>
                  <div className="cmx-group-avatar-row">
                    <div className="cmx-group-avatar-preview">
                      {currentAvatarPreview ? (
                        <img src={currentAvatarPreview} alt="" className="cmx-group-avatar-image" />
                      ) : (
                        <span>{getInitials(settingsEditUserName.trim() || settingsEditUserTarget.name)}</span>
                      )}
                    </div>
                    <div className="cmx-group-avatar-actions">
                      <button
                        type="button"
                        className="cmx-group-avatar-btn"
                        onClick={handlePickAvatar}
                      >
                        <Icon name="paperclip" className="cmx-icon-btn-inner" />
                        <span>Выбрать</span>
                      </button>
                      {(currentAvatarPreview || settingsEditOwnAvatar) && (
                        <button
                          type="button"
                          className="cmx-group-avatar-btn danger"
                          onClick={() => {
                            if (avatarPreviewUrl) {
                              URL.revokeObjectURL(avatarPreviewUrl);
                            }
                            setAvatarFile(null);
                            setAvatarPreviewUrl('');
                            setClearAvatar(true);
                          }}
                        >
                          <Icon name="x" className="cmx-icon-btn-inner" />
                          <span>Убрать</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="cmx-hidden-file-input"
                    onChange={handleAvatarFileChange}
                  />
                </div>
              )}
              <div className="cmx-settings-confirm-actions">
                <button
                  type="button"
                  className="cmx-settings-confirm-cancel"
                  onClick={closeSettingsUserEdit}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="cmx-settings-add-role-btn"
                  onClick={() =>
                    saveSettingsUserEdit({
                      avatarFile,
                      clearAvatar
                    })
                  }
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsInviteCode && (
        <div
          className="cmx-settings-confirm-overlay"
          role="dialog"
          aria-label="Код доступа"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSettingsInviteCode();
            }
          }}
        >
          <div className="cmx-settings-confirm-modal">
            <div className="cmx-settings-modal-header">
              <div className="cmx-settings-modal-title-wrap">
                <Icon name="key" className="cmx-icon-btn-inner" />
                <div className="cmx-settings-modal-title">Код доступа</div>
              </div>
              <button
                type="button"
                className="cmx-settings-modal-close"
                onClick={closeSettingsInviteCode}
                title="Закрыть"
              >
                <Icon name="x" className="cmx-icon-btn-inner" />
              </button>
            </div>
            <div className="cmx-settings-confirm-body">
              <div className="cmx-settings-invite-label">{settingsInviteLabel || 'Код'}</div>
              <div className="cmx-settings-invite-digits">
                {settingsInviteCode.split('').map((digit, index) => (
                  <span key={`invite-digit-${index}`} className="cmx-settings-invite-digit">
                    {digit}
                  </span>
                ))}
              </div>
              <div className="cmx-settings-confirm-actions">
                <button
                  type="button"
                  className="cmx-settings-confirm-cancel"
                  onClick={() => {
                    void refreshSettingsInviteCode();
                  }}
                  disabled={settingsInviteGenerating}
                >
                  <Icon name="refresh" className="cmx-icon-btn-inner" />
                  Обновить
                </button>
                <button
                  type="button"
                  className="cmx-settings-add-role-btn cmx-settings-invite-copy-btn"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(settingsInviteCode);
                      toast.success('Код скопирован');
                    } catch {
                      toast.error('Не удалось скопировать код');
                    }
                  }}
                  disabled={settingsInviteGenerating}
                >
                  <Icon name="copy" className="cmx-icon-btn-inner" />
                  Копировать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { PrototypeSettingsModal };
