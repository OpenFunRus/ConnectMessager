import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { TChannel } from '@connectmessager/shared';
import { getFileUrl } from '@/helpers/get-file-url';
import { Icon } from './icon';

export type TPrototypeGroupDraftPayload = {
  name: string;
  description: string;
  filter: string;
  avatarFile: File | null;
  clearAvatar: boolean;
};

type TPrototypeGroupEditorModalProps = {
  isOpen: boolean;
  mode: 'create' | 'edit';
  group: TChannel | null;
  filterOptions: readonly string[];
  lockedFilter: string | null;
  submitting: boolean;
  onClose: () => void;
  onCreate: (payload: TPrototypeGroupDraftPayload) => Promise<void>;
  onUpdate: (channelId: number, payload: TPrototypeGroupDraftPayload) => Promise<void>;
};

const PrototypeGroupEditorModal = ({
  isOpen,
  mode,
  group,
  filterOptions,
  lockedFilter,
  submitting,
  onClose,
  onCreate,
  onUpdate
}: TPrototypeGroupEditorModalProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState(filterOptions[0] ?? 'Все');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [clearAvatar, setClearAvatar] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(group?.name ?? '');
    setDescription(group?.groupDescription ?? '');
    setFilter(lockedFilter ?? group?.groupFilter ?? filterOptions[0] ?? 'Все');
    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setClearAvatar(false);
  }, [filterOptions, group, isOpen, lockedFilter]);

  useEffect(
    () => () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    },
    [avatarPreviewUrl]
  );

  const currentPreview = useMemo(() => {
    if (avatarPreviewUrl) return avatarPreviewUrl;
    if (clearAvatar) return '';
    return getFileUrl(group?.groupAvatar);
  }, [avatarPreviewUrl, clearAvatar, group?.groupAvatar]);

  if (!isOpen) return null;

  const handlePickAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Для аватарки группы можно выбрать только изображение.');
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setClearAvatar(false);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Введите название группы.');
      return;
    }

    const payload: TPrototypeGroupDraftPayload = {
      name: trimmedName,
      description: description.trim(),
      filter: lockedFilter ?? filter,
      avatarFile,
      clearAvatar
    };

    if (mode === 'create') {
      await onCreate(payload);
      return;
    }

    if (group?.id) {
      await onUpdate(group.id, payload);
    }
  };

  return (
    <div
      className="cmx-settings-modal-overlay"
      role="dialog"
      aria-label={mode === 'create' ? 'Создание группы' : 'Редактирование группы'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="cmx-group-editor-modal">
        <div className="cmx-settings-modal-header cmx-group-editor-header">
          <div className="cmx-settings-modal-title-wrap">
            <div className="cmx-group-editor-header-icon">
              <Icon name="users-group" className="cmx-icon-btn-inner" />
            </div>
            <div>
              <div className="cmx-settings-modal-title">
                {mode === 'create' ? 'Создать группу' : 'Редактировать группу'}
              </div>
              <div className="cmx-group-editor-header-subtitle">
                Группа видна только выбранному фильтру и роли Все
              </div>
            </div>
          </div>
          <button
            type="button"
            className="cmx-settings-modal-close"
            onClick={onClose}
            title="Закрыть"
            disabled={submitting}
          >
            <Icon name="x" className="cmx-icon-btn-inner" />
          </button>
        </div>

        <div className="cmx-group-editor-body">
          <label className="cmx-group-editor-field">
            <span className="cmx-group-editor-label">Название группы</span>
            <input
              className="cmx-group-editor-input"
              value={name}
              maxLength={27}
              onChange={(event) => setName(event.target.value)}
              placeholder="Введите название группы"
            />
          </label>

          <label className="cmx-group-editor-field">
            <span className="cmx-group-editor-label">Описание группы</span>
            <input
              className="cmx-group-editor-input"
              value={description}
              maxLength={32}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Короткое описание группы"
            />
            <span className="cmx-group-editor-hint">{description.length}/32</span>
          </label>

          <div className="cmx-group-editor-field">
            <span className="cmx-group-editor-label">Аватарка</span>
            <div className="cmx-group-avatar-row">
              <div className="cmx-group-avatar-preview">
                {currentPreview ? (
                  <img src={currentPreview} alt="" className="cmx-group-avatar-image" />
                ) : (
                  <span>{name.trim() ? name.trim().slice(0, 2).toUpperCase() : 'ГР'}</span>
                )}
              </div>
              <div className="cmx-group-avatar-actions">
                <button type="button" className="cmx-group-avatar-btn" onClick={handlePickAvatar}>
                  <Icon name="paperclip" className="cmx-icon-btn-inner" />
                  <span>Выбрать</span>
                </button>
                {(currentPreview || group?.groupAvatarId) && (
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
              onChange={handleFileChange}
            />
          </div>

          <label className="cmx-group-editor-field">
            <span className="cmx-group-editor-label">Кто видит группу</span>
            <select
              className="cmx-group-editor-input"
              value={lockedFilter ?? filter}
              disabled={!!lockedFilter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {filterOptions.map((item) => (
                <option key={`group-filter-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cmx-group-editor-actions">
          <button
            type="button"
            className="cmx-group-editor-action secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            type="button"
            className="cmx-group-editor-action primary"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={submitting}
          >
            {mode === 'create' ? 'Создать группу' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export { PrototypeGroupEditorModal };
