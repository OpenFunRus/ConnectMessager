import { findStandardEmoji } from '@/components/emoji-picker/emoji-data';
import { shouldUseFallbackImage } from '@/components/tiptap-input/helpers';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TFile, TJoinedMessageReaction } from '@connectmessager/shared';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useMemo } from 'react';

type TAggregatedReaction = {
  emoji: string;
  count: number;
  createdAt: number;
  file: TFile | null;
  isOwnReaction: boolean;
};

type TPrototypeMessageReactionsProps = {
  messageId: number;
  reactions: TJoinedMessageReaction[];
  ownUserId?: number;
  onToggleReaction: (messageId: number, emoji: string) => Promise<void>;
  onOpenReactionPicker: (messageId: number, anchor: { x: number; y: number }) => void;
};

const renderReactionEmoji = (emoji: string, file: TFile | null) => {
  const standardEmoji = findStandardEmoji(emoji);

  if (standardEmoji?.emoji && !shouldUseFallbackImage(standardEmoji)) {
    return <span className="cmx-message-reaction-emoji-native">{standardEmoji.emoji}</span>;
  }

  const imageUrl = standardEmoji?.fallbackImage ?? (file ? getFileUrl(file) : null);
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`:${emoji}:`}
        className="cmx-message-reaction-emoji-image"
        draggable={false}
        loading="lazy"
      />
    );
  }

  return <span className="cmx-message-reaction-emoji-fallback">:{emoji}:</span>;
};

const PrototypeMessageReactions = ({
  messageId,
  reactions,
  ownUserId,
  onToggleReaction,
  onOpenReactionPicker
}: TPrototypeMessageReactionsProps) => {
  const aggregatedReactions = useMemo(() => {
    const map = new Map<string, TAggregatedReaction>();

    reactions.forEach((reaction) => {
      const existing = map.get(reaction.emoji);
      if (existing) {
        existing.count += 1;
        existing.isOwnReaction ||= reaction.userId === ownUserId;
        return;
      }

      map.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        createdAt: reaction.createdAt,
        file: reaction.file,
        isOwnReaction: reaction.userId === ownUserId
      });
    });

    return [...map.values()].sort((a, b) => a.createdAt - b.createdAt);
  }, [ownUserId, reactions]);

  if (aggregatedReactions.length === 0) {
    return null;
  }

  const handleOpenPicker = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    onOpenReactionPicker(messageId, {
      x: rect.left,
      y: rect.bottom + 8
    });
  };

  return (
    <div className="cmx-message-reactions">
      {aggregatedReactions.map((reaction) => (
        <button
          key={`${messageId}-${reaction.emoji}`}
          type="button"
          className={`cmx-message-reaction ${reaction.isOwnReaction ? 'active' : ''}`}
          title={reaction.isOwnReaction ? 'Убрать реакцию' : 'Поставить такую же реакцию'}
          onClick={() => {
            void onToggleReaction(messageId, reaction.emoji);
          }}
        >
          <span className="cmx-message-reaction-emoji">
            {renderReactionEmoji(reaction.emoji, reaction.file)}
          </span>
          {reaction.count > 1 ? (
            <span className="cmx-message-reaction-count">{reaction.count}</span>
          ) : null}
        </button>
      ))}
      <button
        type="button"
        className="cmx-message-reaction-add"
        title="Добавить реакцию"
        aria-label="Добавить реакцию"
        onClick={handleOpenPicker}
      >
        <span className="cmx-message-reaction-add-icon">+</span>
      </button>
    </div>
  );
};

export { PrototypeMessageReactions };
