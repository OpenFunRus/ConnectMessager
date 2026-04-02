import type { ChangeEvent, CSSProperties, Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { filesize } from 'filesize';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import type { TTempFile } from '@connectmessager/shared';
import type { TActiveQuote, TGifItem } from '../types';
import { TENOR_LIMIT } from '../constants';
import { getFileIconNameByExtension } from '../utils';
import { Icon } from './icon';

type TEmojiGroup = {
  id: string;
  label: string;
  emojis: TEmojiItem[];
};

const formatQuoteLine = (author: string, text: string, maxLength: number) => {
  const normalizedText = text.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const full = `↳ @${author}: ${normalizedText || '[вложение]'}`;
  return full.length > maxLength ? `${full.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...` : full;
};

type TPrototypeComposerProps = {
  draftHtml: string;
  submitMessage: () => Promise<void>;
  activeQuote: TActiveQuote | null;
  clearActiveQuote: () => void;
  composerInputWrapRef: { current: HTMLDivElement | null };
  isComposerExpanded: boolean;
  setIsComposerExpanded: Dispatch<SetStateAction<boolean>>;
  composerEditor: Editor | null;
  emojiButtonRef: { current: HTMLButtonElement | null };
  isEmojiPickerOpen: boolean;
  setIsEmojiPickerOpen: Dispatch<SetStateAction<boolean>>;
  emojiPopoverRef: { current: HTMLDivElement | null };
  emojiPanelTab: 'emoji' | 'gifs';
  setEmojiPanelTab: Dispatch<SetStateAction<'emoji' | 'gifs'>>;
  topRecentEmojis: TEmojiItem[];
  emojiGroups: TEmojiGroup[];
  insertEmojiShortcode: (emoji: TEmojiItem) => void;
  gifSearch: string;
  setGifSearch: Dispatch<SetStateAction<string>>;
  gifLoading: boolean;
  gifLoadFailed: boolean;
  gifItems: TGifItem[];
  submitGifMessage: (gifUrl: string) => Promise<void>;
  openAttachModal: () => Promise<void>;
  uploading: boolean;
  isAttachModalOpen: boolean;
  attachModalFiles: TTempFile[];
  openModalFileDialog: () => void;
  attachModalUploading: boolean;
  attachModalSending: boolean;
  attachModalUploadingSize: number;
  removeAttachModalFile: (fileId: string) => Promise<void>;
  attachModalComment: string;
  setAttachModalComment: Dispatch<SetStateAction<string>>;
  closeAttachModal: () => Promise<void>;
  submitAttachModal: () => Promise<void>;
  modalFileInputRef: { current: HTMLInputElement | null };
  onModalFileInputChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

const PrototypeComposer = ({
  draftHtml,
  submitMessage,
  activeQuote,
  clearActiveQuote,
  composerInputWrapRef,
  isComposerExpanded,
  setIsComposerExpanded,
  composerEditor,
  emojiButtonRef,
  isEmojiPickerOpen,
  setIsEmojiPickerOpen,
  emojiPopoverRef,
  emojiPanelTab,
  setEmojiPanelTab,
  topRecentEmojis,
  emojiGroups,
  insertEmojiShortcode,
  gifSearch,
  setGifSearch,
  gifLoading,
  gifLoadFailed,
  gifItems,
  submitGifMessage,
  openAttachModal,
  uploading,
  isAttachModalOpen,
  attachModalFiles,
  openModalFileDialog,
  attachModalUploading,
  attachModalSending,
  attachModalUploadingSize,
  removeAttachModalFile,
  attachModalComment,
  setAttachModalComment,
  closeAttachModal,
  submitAttachModal,
  modalFileInputRef,
  onModalFileInputChange
}: TPrototypeComposerProps) => {
  const composerQuoteLine = activeQuote
    ? formatQuoteLine(activeQuote.author, activeQuote.text, 30)
    : '';
  const composerQuoteWidth = activeQuote
    ? Math.min(320, Math.max(96, composerQuoteLine.length * 10 + 24))
    : 0;
  const isComposerEmpty = composerEditor ? composerEditor.isEmpty : !draftHtml;
  const [selectedEmojiGroupId, setSelectedEmojiGroupId] = useState<string>('');
  const selectedEmojiGroup = useMemo(
    () =>
      emojiGroups.find((group) => group.id === selectedEmojiGroupId) ??
      emojiGroups[0] ??
      null,
    [emojiGroups, selectedEmojiGroupId]
  );

  useEffect(() => {
    if (!emojiGroups.length) {
      setSelectedEmojiGroupId('');
      return;
    }

    setSelectedEmojiGroupId((prev) =>
      emojiGroups.some((group) => group.id === prev) ? prev : emojiGroups[0]!.id
    );
  }, [emojiGroups]);

  return (
    <>
      <form
        className="cmx-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage();
        }}
      >
        <div className="cmx-composer-main">
          <div
            ref={composerInputWrapRef}
            className={`cmx-composer-input-wrap ${isComposerExpanded ? 'expanded' : ''} ${activeQuote ? 'has-quote' : ''}`}
            style={
              activeQuote
                ? ({
                    ['--cmx-quote-inline-width' as string]: `${composerQuoteWidth}px`
                  } as CSSProperties)
                : undefined
            }
          >
            <button
              className="cmx-compose-expand-toggle"
              type="button"
              aria-label={isComposerExpanded ? 'Свернуть поле ввода' : 'Развернуть поле ввода'}
              title={isComposerExpanded ? 'Свернуть поле ввода' : 'Развернуть поле ввода'}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setIsComposerExpanded((prev) => !prev);
              }}
            >
              <Icon name="chevron-up" className="cmx-icon-expand" />
            </button>
            {activeQuote && (
              <button
                type="button"
                className="cmx-composer-quote"
                title="Убрать цитирование"
                onClick={clearActiveQuote}
              >
                <span className="cmx-composer-quote-line">{composerQuoteLine}</span>
              </button>
            )}
            {isComposerEmpty && !activeQuote && (
              <div className="cmx-editor-placeholder" aria-hidden="true">
                Введите сообщение...
              </div>
            )}
            <EditorContent editor={composerEditor} className="cmx-textarea cmx-editor tiptap" />
          </div>
        </div>
        <div className="cmx-emoji-anchor">
          <button
            ref={emojiButtonRef}
            className="cmx-icon-btn"
            type="button"
            title="Смайлы"
            aria-label="Смайлы"
            onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
          >
            <Icon name="mood-smile" className="cmx-icon-btn-inner" />
          </button>
          {isEmojiPickerOpen && (
            <div ref={emojiPopoverRef} className="cmx-emoji-popover" role="dialog" aria-label="Выбор смайликов">
              <div className="cmx-emoji-tabs" role="tablist" aria-label="Режим выбора">
                <button
                  type="button"
                  role="tab"
                  aria-selected={emojiPanelTab === 'emoji'}
                  className={`cmx-emoji-tab-btn ${emojiPanelTab === 'emoji' ? 'active' : ''}`}
                  onClick={() => setEmojiPanelTab('emoji')}
                >
                  Смайлики
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={emojiPanelTab === 'gifs'}
                  className={`cmx-emoji-tab-btn ${emojiPanelTab === 'gifs' ? 'active' : ''}`}
                  onClick={() => setEmojiPanelTab('gifs')}
                >
                  GIF
                </button>
              </div>

              {emojiPanelTab === 'emoji' ? (
                <>
                    <div className="cmx-emoji-popover-title">Последние</div>
                    <div className="cmx-emoji-recent-row">
                      {topRecentEmojis.map((emoji) => (
                        <button
                          key={`recent-${emoji.name}`}
                          className="cmx-emoji-item"
                          type="button"
                          title={`:${emoji.shortcodes[0] ?? emoji.name}:`}
                          onClick={() => insertEmojiShortcode(emoji)}
                        >
                          <img
                            src={emoji.fallbackImage}
                            alt={emoji.emoji ?? emoji.name}
                            className="cmx-emoji-item-icon"
                            draggable={false}
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                    <div className="cmx-emoji-header-divider" aria-hidden="true" />
                    <div className="cmx-emoji-group-tabs-wrap">
                      <div className="cmx-emoji-group-tabs" role="tablist" aria-label="Категории смайликов">
                        {emojiGroups.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            role="tab"
                            aria-selected={selectedEmojiGroup?.id === group.id}
                            className={`cmx-emoji-group-tab ${selectedEmojiGroup?.id === group.id ? 'active' : ''}`}
                            onClick={() => setSelectedEmojiGroupId(group.id)}
                            title={group.label}
                          >
                            {group.emojis[0] ? (
                              <img
                                src={group.emojis[0].fallbackImage}
                                alt={group.label}
                                className="cmx-emoji-group-tab-icon"
                                draggable={false}
                                loading="lazy"
                              />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="cmx-emoji-scroll">
                      {selectedEmojiGroup ? (
                        <div key={selectedEmojiGroup.id} className="cmx-emoji-group">
                          <div className="cmx-emoji-group-grid">
                            {selectedEmojiGroup.emojis.map((emoji) => (
                              <button
                                key={`${selectedEmojiGroup.id}-${emoji.name}`}
                                className="cmx-emoji-item"
                                type="button"
                                title={`:${emoji.shortcodes[0] ?? emoji.name}:`}
                                onClick={() => insertEmojiShortcode(emoji)}
                              >
                                <img
                                  src={emoji.fallbackImage}
                                  alt={emoji.emoji ?? emoji.name}
                                  className="cmx-emoji-item-icon"
                                  draggable={false}
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      value={gifSearch}
                      onChange={(event) => setGifSearch(event.target.value)}
                      className="cmx-gif-search"
                      placeholder="Поиск GIF..."
                    />
                    <div className="cmx-emoji-scroll">
                      {gifLoading ? (
                        <div className="cmx-gif-grid cmx-gif-grid-loading" aria-hidden="true">
                          {Array.from({ length: TENOR_LIMIT }).map((_, index) => (
                            <div key={`gif-skeleton-${index}`} className="cmx-gif-item cmx-gif-item-skeleton" />
                          ))}
                        </div>
                      ) : gifLoadFailed ? (
                        <div className="cmx-gif-state">Не удалось загрузить GIF</div>
                      ) : gifItems.length === 0 ? (
                        <div className="cmx-gif-state">GIF не найдены</div>
                      ) : (
                        <div className="cmx-gif-grid">
                          {gifItems.slice(0, TENOR_LIMIT).map((gif) => (
                            <button
                              key={gif.id}
                              className="cmx-gif-item"
                              type="button"
                              title="Отправить GIF"
                              onClick={() => {
                                void submitGifMessage(gif.url);
                              }}
                            >
                              <img
                                src={gif.previewUrl}
                                alt="GIF preview"
                                className="cmx-gif-item-image"
                                loading="lazy"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
              )}
            </div>
          )}
        </div>
        <button
          className="cmx-icon-btn"
          type="button"
          title="Прикрепить файл"
          onClick={() => {
            void openAttachModal();
          }}
          disabled={uploading}
        >
          <Icon name="paperclip" className="cmx-icon-btn-inner" />
        </button>
        <button className="cmx-icon-btn cmx-send" type="submit" title="Отправить">
          <Icon name="send" className="cmx-icon-btn-inner" />
        </button>
      </form>

      {isAttachModalOpen && (
        <div className="cmx-attach-modal-overlay" role="dialog" aria-label="Прикрепление файлов">
          <div className="cmx-attach-modal">
            {attachModalFiles.length === 0 && (
              <button
                type="button"
                className="cmx-attach-plus"
                onClick={openModalFileDialog}
                disabled={attachModalUploading || attachModalSending}
              >
                + Добавить файл
              </button>
            )}

            {attachModalUploading && (
              <div className="cmx-uploading-state">
                Загружаются файлы ({filesize(attachModalUploadingSize)})
              </div>
            )}

            {attachModalFiles.length > 0 && (
              <div className="cmx-attached-files cmx-message-files-grid">
                {attachModalFiles.map((file) => (
                  <div key={file.id} className="cmx-message-file-col">
                    <div className="cmx-attach-file-item">
                      <div className="cmx-message-file-card cmx-message-file-card-static">
                        <div className="cmx-message-file-icon-wrap">
                          <Icon
                            name={getFileIconNameByExtension(file.extension)}
                            className="cmx-message-file-icon"
                          />
                        </div>
                        <div className="cmx-message-file-meta">
                          <div className="cmx-message-file-name">{file.originalName}</div>
                          <div className="cmx-message-file-size">{filesize(file.size)}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cmx-icon-btn cmx-attached-file-remove-btn"
                        title="Убрать файл"
                        onClick={() => {
                          void removeAttachModalFile(file.id);
                        }}
                      >
                        <img
                          src="/icons/tabler/x.svg"
                          alt=""
                          aria-hidden="true"
                          className="cmx-attached-file-remove-icon"
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {attachModalFiles.length > 0 && (
              <button
                type="button"
                className="cmx-attach-plus"
                onClick={openModalFileDialog}
                disabled={attachModalUploading || attachModalSending}
              >
                + Добавить файл
              </button>
            )}

            <textarea
              className="cmx-attach-comment"
              value={attachModalComment}
              onChange={(event) => setAttachModalComment(event.target.value)}
              placeholder="Комментарий к файлам (необязательно)"
              rows={4}
              disabled={attachModalSending}
            />

            <div className="cmx-attach-actions">
              <button
                type="button"
                className="cmx-attach-btn cmx-attach-cancel"
                onClick={() => {
                  void closeAttachModal();
                }}
                disabled={attachModalSending}
              >
                Отмена
              </button>
              <button
                type="button"
                className="cmx-attach-btn cmx-attach-send"
                onClick={() => {
                  void submitAttachModal();
                }}
                disabled={
                  attachModalSending || attachModalUploading || attachModalFiles.length === 0
                }
              >
                Отправить
              </button>
            </div>

            <input
              ref={modalFileInputRef}
              type="file"
              multiple
              onChange={(event) => {
                void onModalFileInputChange(event);
              }}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export { PrototypeComposer };
