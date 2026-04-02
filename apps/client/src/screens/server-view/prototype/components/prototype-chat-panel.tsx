import type {
  ClipboardEvent as ReactClipboardEvent,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode
} from 'react';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { RelativeTime } from '@/components/relative-time';
import type { TFile } from '@connectmessager/shared';
import { getFileUrl } from '@/helpers/get-file-url';
import { MessageFilesGrid } from './message-files-grid';
import { PrototypeChatOverlays } from './prototype-chat-overlays';
import { PrototypeMessageReactionPicker } from './prototype-message-reaction-picker';
import { PrototypeMessageReactions } from './prototype-message-reactions';
import { Icon } from './icon';
import type {
  TChat,
  TMessage,
  TMessageContextMenuState,
  TMessageReactionPickerState
} from '../types';
import { getInitials } from '../utils';

const formatQuoteLine = (author: string, text: string, maxLength: number) => {
  const normalizedText = text
    .replace(/\r\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const full = `↳ @${author}: ${normalizedText || '[вложение]'}`;
  return full.length > maxLength ? `${full.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...` : full;
};

type TRenderedMessage = TMessage & {
  showMeta: boolean;
  groupedWithNext: boolean;
};

type TPrototypeChatPanelProps = {
  activeChat: TChat | null;
  typingIndicatorText: string;
  isComposerSymbolOverflow: boolean;
  composerSymbolCount: number;
  roleMessageCharsLimit: number;
  isComposerLineOverflow: boolean;
  composerLineCount: number;
  roleMessageLinesLimit: number;
  canUseVoiceCalls: boolean;
  canUseVideoCalls: boolean;
  canUseRemoteDesktop: boolean;
  isNotesChat: boolean;
  setIsPinnedPopoverOpen: (value: boolean) => void;
  isPinnedPopoverOpen: boolean;
  pinnedLoading: boolean;
  pinnedMessages: TMessage[];
  openPinnedMessageInChat: (messageId: number) => Promise<void>;
  chatBodyRef: { current: HTMLElement | null };
  onChatDragEnter: (event: ReactDragEvent<HTMLElement>) => void;
  handleChatScroll: () => void;
  onChatDragOver: (event: ReactDragEvent<HTMLElement>) => void;
  onChatDragLeave: (event: ReactDragEvent<HTMLElement>) => void;
  onChatDrop: (event: ReactDragEvent<HTMLElement>) => void;
  onChatPaste: (event: ReactClipboardEvent<HTMLElement>) => void;
  visibleMessages: TMessage[];
  renderMessages: TRenderedMessage[];
  messageContextMenu: TMessageContextMenuState | null;
  jumpHighlightedMessageId: number | null;
  handleMessageContextMenu: (event: ReactMouseEvent<HTMLElement>, message: TMessage) => void;
  onMessageCopy: (event: ReactClipboardEvent<HTMLDivElement>, fallbackText: string) => void;
  renderMessageContent: (message: TMessage) => ReactNode;
  openImageViewer: (file: TFile) => void;
  downloadFileWithPrompt: (file: TFile) => Promise<void>;
  closeMessageContextMenu: () => void;
  onMessageMenuAction: (
    action: 'reactions' | 'pin' | 'quote' | 'delete' | 'mention'
  ) => Promise<void>;
  ownUserId?: number;
  toggleMessageReaction: (messageId: number, emoji: string) => Promise<void>;
  openMessageReactionPicker: (messageId: number, anchor: { x: number; y: number }) => void;
  messageReactionPicker: TMessageReactionPickerState | null;
  closeMessageReactionPicker: () => void;
  onSelectMessageReaction: (messageId: number, emoji: TEmojiItem) => void;
  topRecentEmojis: TEmojiItem[];
  emojiGroups: Array<{
    id: string;
    label: string;
    emojis: TEmojiItem[];
  }>;
  messageContextMenuRef: { current: HTMLDivElement | null };
  isDragOverlayVisible: boolean;
  showScrollToBottom: boolean;
  handleScrollToBottomClick: () => Promise<void>;
  imageViewerFile: TFile | null;
  closeImageViewer: () => void;
  imageViewerStageRef: { current: HTMLDivElement | null };
  imageViewerZoom: number;
  isImageViewerPanning: boolean;
  onImageViewerWheel: TPrototypeChatOverlaysProps['onImageViewerWheel'];
  onImageViewerPointerDown: TPrototypeChatOverlaysProps['onImageViewerPointerDown'];
  onImageViewerPointerMove: TPrototypeChatOverlaysProps['onImageViewerPointerMove'];
  onImageViewerPointerUp: TPrototypeChatOverlaysProps['onImageViewerPointerUp'];
  onImageViewerLostPointerCapture: () => void;
  imageViewerPan: { x: number; y: number };
};

type TPrototypeChatOverlaysProps = Parameters<typeof PrototypeChatOverlays>[0];

const PrototypeChatPanel = ({
  activeChat,
  typingIndicatorText,
  isComposerSymbolOverflow,
  composerSymbolCount,
  roleMessageCharsLimit,
  isComposerLineOverflow,
  composerLineCount,
  roleMessageLinesLimit,
  canUseVoiceCalls,
  canUseVideoCalls,
  canUseRemoteDesktop,
  isNotesChat,
  setIsPinnedPopoverOpen,
  isPinnedPopoverOpen,
  pinnedLoading,
  pinnedMessages,
  openPinnedMessageInChat,
  chatBodyRef,
  onChatDragEnter,
  handleChatScroll,
  onChatDragOver,
  onChatDragLeave,
  onChatDrop,
  onChatPaste,
  visibleMessages,
  renderMessages,
  messageContextMenu,
  jumpHighlightedMessageId,
  handleMessageContextMenu,
  onMessageCopy,
  renderMessageContent,
  openImageViewer,
  downloadFileWithPrompt,
  closeMessageContextMenu,
  onMessageMenuAction,
  ownUserId,
  toggleMessageReaction,
  openMessageReactionPicker,
  messageReactionPicker,
  closeMessageReactionPicker,
  onSelectMessageReaction,
  topRecentEmojis,
  emojiGroups,
  messageContextMenuRef,
  isDragOverlayVisible,
  showScrollToBottom,
  handleScrollToBottomClick,
  imageViewerFile,
  closeImageViewer,
  imageViewerStageRef,
  imageViewerZoom,
  isImageViewerPanning,
  onImageViewerWheel,
  onImageViewerPointerDown,
  onImageViewerPointerMove,
  onImageViewerPointerUp,
  onImageViewerLostPointerCapture,
  imageViewerPan
}: TPrototypeChatPanelProps) => {
  return (
    <main className="cmx-chat">
      <header className="cmx-chat-header">
        <h2 className="cmx-chat-title">
          {activeChat ? activeChat.title : 'Добро пожаловать в Мессенджер Коннект'}
        </h2>
        <div className="cmx-chat-actions">
          {canUseVoiceCalls && (
            <button
              className="cmx-chat-action"
              type="button"
              title={isNotesChat ? 'В чате Заметки звонок недоступен' : 'Звонок (скоро)'}
              disabled={isNotesChat}
            >
              <Icon name="phone" className="cmx-icon-chat-action" />
            </button>
          )}
          {canUseVideoCalls && (
            <button
              className="cmx-chat-action"
              type="button"
              title={isNotesChat ? 'В чате Заметки видеозвонок недоступен' : 'Видеозвонок (скоро)'}
              disabled={isNotesChat}
            >
              <Icon name="video" className="cmx-icon-chat-action" />
            </button>
          )}
          {canUseRemoteDesktop && (
            <button
              className="cmx-chat-action"
              type="button"
              title={isNotesChat ? 'В чате Заметки демонстрация экрана недоступна' : 'Демонстрация экрана (скоро)'}
              disabled={isNotesChat}
            >
              <Icon name="screen-share" className="cmx-icon-chat-action" />
            </button>
          )}
          <button
            className="cmx-chat-action"
            type="button"
            title="Закрепленные сообщения"
            onClick={() => {
              setIsPinnedPopoverOpen(true);
            }}
          >
            <Icon name="pin" className="cmx-icon-chat-action" />
          </button>
        </div>
      </header>

      {isPinnedPopoverOpen && (
        <>
          <button
            type="button"
            className="cmx-popover-backdrop"
            aria-label="Закрыть закрепленные сообщения"
            onClick={() => setIsPinnedPopoverOpen(false)}
          />
          <div className="cmx-pinned-popover">
            <div className="cmx-pinned-popover-header">
              <span>Закрепленные сообщения</span>
              <button
                type="button"
                className="cmx-pinned-popover-close"
                onClick={() => setIsPinnedPopoverOpen(false)}
                title="Закрыть"
              >
                <Icon name="x" className="cmx-icon-btn-inner" />
              </button>
            </div>
            <div className="cmx-pinned-popover-body">
              {pinnedLoading ? (
                <div className="cmx-pinned-popover-state">Загрузка...</div>
              ) : pinnedMessages.length === 0 ? (
                <div className="cmx-pinned-popover-state">Нет закрепленных сообщений</div>
              ) : (
                pinnedMessages.map((message) => (
                  <button
                    key={`pinned-${message.id}`}
                    type="button"
                    className="cmx-pinned-item cmx-mention-item"
                    onClick={() => {
                      void openPinnedMessageInChat(message.id);
                    }}
                  >
                    <div className="cmx-pinned-item-head">
                      <div className="cmx-pinned-item-author">{message.author}</div>
                      {message.pinnedAt ? (
                        <RelativeTime date={new Date(message.pinnedAt)}>
                          {(relativeTime) => <span className="cmx-pinned-time">{relativeTime}</span>}
                        </RelativeTime>
                      ) : (
                        <span className="cmx-pinned-time">только что</span>
                      )}
                    </div>
                    <div className="cmx-pinned-item-text">{message.text || '[вложение]'}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <section
        className="cmx-chat-body"
        ref={(node) => {
          chatBodyRef.current = node;
        }}
        onDragEnter={onChatDragEnter}
        onScroll={handleChatScroll}
        onDragOver={onChatDragOver}
        onDragLeave={onChatDragLeave}
        onDrop={onChatDrop}
        onPaste={onChatPaste}
      >
        {!activeChat ? (
          <div className="cmx-placeholder">Выберите контакт или группу для начала общения.</div>
        ) : visibleMessages.length === 0 ? (
          <div className="cmx-placeholder">Напишите сообщение чтобы начать чат</div>
        ) : (
          <div className="cmx-messages">
            {renderMessages.map((message) => (
              <article
                key={message.id}
                className={`cmx-message ${message.showMeta ? '' : 'compact'} ${message.showMeta && message.groupedWithNext ? 'grouped-head' : ''} ${messageContextMenu?.messageId === message.id ? 'context-open' : ''} ${jumpHighlightedMessageId === message.id ? 'jump-highlight' : ''} ${message.hasOwnMention ? 'mention-highlight' : ''}`.trim()}
                data-message-id={message.id}
                onContextMenu={(event) => handleMessageContextMenu(event, message)}
              >
                {message.showMeta ? (
                  <div className="cmx-avatar">
                    {message.avatar ? (
                      <img className="cmx-avatar-image" src={getFileUrl(message.avatar)} alt="" />
                    ) : (
                      getInitials(message.author)
                    )}
                  </div>
                ) : (
                  <div className="cmx-message-spacer" aria-hidden="true" />
                )}
                <div>
                  {message.showMeta && (
                    <div>
                      <span className="cmx-message-author">{message.author}</span>
                      <RelativeTime date={new Date(message.createdAt)}>
                        {(relativeTime) => <span className="cmx-message-time">{relativeTime}</span>}
                      </RelativeTime>
                    </div>
                  )}
                  {message.quote && (
                    <button
                      type="button"
                      className="cmx-message-quote"
                      onClick={() => {
                        void openPinnedMessageInChat(message.quote!.messageId);
                      }}
                    >
                      <span className="cmx-message-quote-line">
                        {formatQuoteLine(message.quote.author, message.quote.text, 100)}
                      </span>
                    </button>
                  )}
                  <div
                    className={`cmx-message-text ${message.emojiOnly ? 'emoji-only' : ''} ${
                      message.emojiOnlyCount === 1
                        ? 'emoji-only-single'
                        : message.emojiOnlyCount && message.emojiOnlyCount <= 5
                          ? 'emoji-only-medium'
                          : message.emojiOnly
                            ? 'emoji-only-inline'
                            : ''
                    }`.trim()}
                    onCopy={(event) => onMessageCopy(event, message.text)}
                  >
                    {renderMessageContent(message)}
                  </div>
                  {message.files.length > 0 && (
                    <div className="cmx-message-files">
                      <MessageFilesGrid
                        files={message.files}
                        onOpenImage={openImageViewer}
                        onDownloadFile={(targetFile) => {
                          void downloadFileWithPrompt(targetFile);
                        }}
                      />
                    </div>
                  )}
                  <PrototypeMessageReactions
                    messageId={message.id}
                    reactions={message.reactions}
                    ownUserId={ownUserId}
                    onToggleReaction={toggleMessageReaction}
                    onOpenReactionPicker={openMessageReactionPicker}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <PrototypeMessageReactionPicker
        pickerState={messageReactionPicker}
        topRecentEmojis={topRecentEmojis}
        emojiGroups={emojiGroups}
        closePicker={closeMessageReactionPicker}
        onSelectReaction={onSelectMessageReaction}
      />
      <div className="cmx-chat-info-bar">
        <div className={`cmx-chat-info-typing ${typingIndicatorText ? 'visible' : ''}`}>
          {typingIndicatorText || '\u00A0'}
        </div>
        <div className="cmx-chat-info-limits" aria-hidden="true">
          <span className="cmx-chat-info-limits-item">
            символов:{' '}
            <span className={isComposerSymbolOverflow ? 'cmx-composer-limit-over' : ''}>
              {composerSymbolCount}
            </span>{' '}
            / {roleMessageCharsLimit}
          </span>
          <span className="cmx-chat-info-limits-item">
            строк:{' '}
            <span className={isComposerLineOverflow ? 'cmx-composer-limit-over' : ''}>
              {composerLineCount}
            </span>{' '}
            / {roleMessageLinesLimit}
          </span>
        </div>
      </div>

      <PrototypeChatOverlays
        messageContextMenu={messageContextMenu}
        messageContextMenuRef={messageContextMenuRef}
        closeMessageContextMenu={closeMessageContextMenu}
        onMessageMenuAction={onMessageMenuAction}
        isDragOverlayVisible={isDragOverlayVisible}
        hasActiveChat={!!activeChat}
        visibleMessagesCount={visibleMessages.length}
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
    </main>
  );
};

export { PrototypeChatPanel };
