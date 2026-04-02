import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import type { TMessageReactionPickerState } from '../types';
import { useEffect, useMemo, useRef, useState } from 'react';

type TEmojiGroup = {
  id: string;
  label: string;
  emojis: TEmojiItem[];
};

type TPrototypeMessageReactionPickerProps = {
  pickerState: TMessageReactionPickerState | null;
  topRecentEmojis: TEmojiItem[];
  emojiGroups: TEmojiGroup[];
  closePicker: () => void;
  onSelectReaction: (messageId: number, emoji: TEmojiItem) => void;
};

const PrototypeMessageReactionPicker = ({
  pickerState,
  topRecentEmojis,
  emojiGroups,
  closePicker,
  onSelectReaction
}: TPrototypeMessageReactionPickerProps) => {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [selectedEmojiGroupId, setSelectedEmojiGroupId] = useState('');

  useEffect(() => {
    if (!pickerState) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (pickerRef.current?.contains(target)) return;
      closePicker();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePicker();
      }
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closePicker, pickerState]);

  useEffect(() => {
    if (!pickerState) return;
    if (!emojiGroups.some((group) => group.id === selectedEmojiGroupId)) {
      setSelectedEmojiGroupId(emojiGroups[0]?.id ?? '');
    }
  }, [emojiGroups, pickerState, selectedEmojiGroupId]);

  const selectedEmojiGroup = useMemo(
    () =>
      emojiGroups.find((group) => group.id === selectedEmojiGroupId) ?? emojiGroups[0] ?? null,
    [emojiGroups, selectedEmojiGroupId]
  );

  if (!pickerState) {
    return null;
  }

  return (
    <div
      ref={pickerRef}
      className="cmx-message-reaction-picker"
      role="dialog"
      aria-label="Выбор реакции"
      style={{ left: `${pickerState.x}px`, top: `${pickerState.y}px` }}
    >
      {topRecentEmojis.length > 0 && (
        <>
          <div className="cmx-message-reaction-picker-title">Последние</div>
          <div className="cmx-emoji-recent-row">
            {topRecentEmojis.map((emoji) => (
              <button
                key={`reaction-recent-${emoji.name}`}
                className="cmx-emoji-item"
                type="button"
                title={`:${emoji.shortcodes[0] ?? emoji.name}:`}
                onClick={() => onSelectReaction(pickerState.messageId, emoji)}
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
        </>
      )}
      <div className="cmx-emoji-group-tabs-wrap">
        <div className="cmx-emoji-group-tabs" role="tablist" aria-label="Категории реакций">
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
      <div className="cmx-message-reaction-picker-scroll">
        {selectedEmojiGroup ? (
          <div className="cmx-emoji-group">
            <div className="cmx-emoji-group-grid">
              {selectedEmojiGroup.emojis.map((emoji) => (
                <button
                  key={`${selectedEmojiGroup.id}-${emoji.name}`}
                  className="cmx-emoji-item"
                  type="button"
                  title={`:${emoji.shortcodes[0] ?? emoji.name}:`}
                  onClick={() => onSelectReaction(pickerState.messageId, emoji)}
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
    </div>
  );
};

export { PrototypeMessageReactionPicker };
