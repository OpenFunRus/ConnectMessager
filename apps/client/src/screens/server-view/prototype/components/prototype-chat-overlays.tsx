import { getFileUrl } from '@/helpers/get-file-url';
import type { TFile } from '@connectmessager/shared';
import type { PointerEvent, WheelEvent } from 'react';
import type { TMessageContextMenuState } from '../types';
import { Icon } from './icon';

type TPrototypeChatOverlaysProps = {
  messageContextMenu: TMessageContextMenuState | null;
  messageContextMenuRef: { current: HTMLDivElement | null };
  closeMessageContextMenu: () => void;
  onMessageMenuAction: (
    action: 'reactions' | 'pin' | 'quote' | 'delete' | 'mention'
  ) => Promise<void>;
  isDragOverlayVisible: boolean;
  hasActiveChat: boolean;
  visibleMessagesCount: number;
  showScrollToBottom: boolean;
  handleScrollToBottomClick: () => Promise<void>;
  imageViewerFile: TFile | null;
  closeImageViewer: () => void;
  imageViewerStageRef: { current: HTMLDivElement | null };
  imageViewerZoom: number;
  isImageViewerPanning: boolean;
  onImageViewerWheel: (event: WheelEvent<HTMLDivElement>) => void;
  onImageViewerPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onImageViewerPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onImageViewerPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onImageViewerLostPointerCapture: () => void;
  imageViewerPan: { x: number; y: number };
};

const PrototypeChatOverlays = ({
  messageContextMenu,
  messageContextMenuRef,
  closeMessageContextMenu,
  onMessageMenuAction,
  isDragOverlayVisible,
  hasActiveChat,
  visibleMessagesCount,
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
}: TPrototypeChatOverlaysProps) => {
  return (
    <>
      {messageContextMenu && (
        <>
          <div
            className="cmx-message-context-backdrop"
            aria-hidden="true"
            onMouseDown={() => closeMessageContextMenu()}
            onContextMenu={(event) => event.preventDefault()}
          />
          <div
            ref={messageContextMenuRef}
            className="cmx-message-context-menu"
            style={{ left: `${messageContextMenu.x}px`, top: `${messageContextMenu.y}px` }}
            role="menu"
            aria-label="Меню сообщения"
          >
            <button
              type="button"
              className="cmx-message-context-menu-item"
              onClick={() => void onMessageMenuAction('reactions')}
            >
              Реакции
            </button>
            <button
              type="button"
              className="cmx-message-context-menu-item"
              onClick={() => void onMessageMenuAction('pin')}
            >
              Закрепить
            </button>
            <button
              type="button"
              className="cmx-message-context-menu-item"
              onClick={() => void onMessageMenuAction('quote')}
            >
              Цитировать
            </button>
            <button
              type="button"
              className="cmx-message-context-menu-item"
              onClick={() => void onMessageMenuAction('mention')}
            >
              Упомянуть
            </button>
            {messageContextMenu.isOwnMessage && (
              <button
                type="button"
                className="cmx-message-context-menu-item danger"
                onClick={() => void onMessageMenuAction('delete')}
              >
                Удалить
              </button>
            )}
          </div>
        </>
      )}

      {isDragOverlayVisible && (
        <div className="cmx-drag-overlay" aria-hidden="true">
          <div className="cmx-drag-overlay-card">
            Отпустите файл, чтобы отправить его в текущий чат
          </div>
        </div>
      )}

      {hasActiveChat && visibleMessagesCount > 0 && showScrollToBottom && (
        <button
          className="cmx-scroll-to-bottom"
          type="button"
          title="Прокрутить вниз"
          aria-label="Прокрутить вниз"
          onClick={() => {
            void handleScrollToBottomClick();
          }}
        >
          <Icon name="chevron-down" className="cmx-icon-scroll-to-bottom" />
        </button>
      )}

      {imageViewerFile && (
        <div
          className="cmx-image-viewer-overlay"
          role="dialog"
          aria-label="Просмотр изображения"
          onClick={closeImageViewer}
        >
          <div
            ref={imageViewerStageRef}
            className={`cmx-image-viewer-stage ${imageViewerZoom > 1 ? 'pan-enabled' : ''} ${isImageViewerPanning ? 'panning' : ''}`.trim()}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onWheel={onImageViewerWheel}
            onPointerDown={onImageViewerPointerDown}
            onPointerMove={onImageViewerPointerMove}
            onPointerUp={onImageViewerPointerUp}
            onPointerCancel={onImageViewerPointerUp}
            onLostPointerCapture={onImageViewerLostPointerCapture}
            onDragStart={(event) => {
              event.preventDefault();
            }}
          >
            <img
              src={getFileUrl(imageViewerFile, { includeVersion: false })}
              alt={imageViewerFile.originalName}
              className="cmx-image-viewer-image"
              draggable={false}
              style={{
                transform: `translate(${imageViewerPan.x}px, ${imageViewerPan.y}px) scale(${imageViewerZoom})`
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export { PrototypeChatOverlays };
