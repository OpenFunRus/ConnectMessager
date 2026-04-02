import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { cn } from '@/lib/utils';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  EMOJI_CATEGORIES,
  findStandardEmoji,
  type EmojiCategoryId,
  getEmojisByCategory
} from './emoji-data';
import { EmojiGrid } from './emoji-grid';
import { useRecentEmojis } from './use-recent-emojis';

type TCategoryBarProps = {
  activeCategory: EmojiCategoryId;
  onCategorySelect: (category: EmojiCategoryId) => void;
  hasRecentEmojis: boolean;
};

const CategoryBar = memo(
  ({
    activeCategory,
    onCategorySelect,
    hasRecentEmojis
  }: TCategoryBarProps) => (
    <div className="flex gap-1 border-b border-[#314055] bg-[#172231] px-3 py-2">
      {EMOJI_CATEGORIES.map((category) => {
        if (category.id === 'recent' && !hasRecentEmojis) {
          return null;
        }

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategorySelect(category.id)}
            className={cn(
              'flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-base text-[#8fa2bb] transition-colors',
              activeCategory === category.id
                ? 'bg-[#223146] text-white'
                : 'hover:bg-[#223146] hover:text-white'
            )}
            title={category.label}
          >
            {findStandardEmoji(category.icon)?.fallbackImage ? (
              <img
                src={findStandardEmoji(category.icon)?.fallbackImage}
                alt={category.label}
                className="h-4 w-4 object-contain"
                loading="lazy"
              />
            ) : (
              category.icon
            )}
          </button>
        );
      })}
    </div>
  )
);

type TNativeEmojiTabProps = {
  onEmojiSelect: (emoji: TEmojiItem) => void;
};

const NativeEmojiTab = memo(({ onEmojiSelect }: TNativeEmojiTabProps) => {
  const { recentEmojis, addRecent } = useRecentEmojis();

  const [activeCategory, setActiveCategory] = useState<EmojiCategoryId>(() =>
    recentEmojis.length > 0 ? 'recent' : 'people & body'
  );

  const hasRecentEmojis = recentEmojis.length > 0;

  const displayEmojis = useMemo(() => {
    if (activeCategory === 'recent') {
      return recentEmojis;
    }
    return getEmojisByCategory(activeCategory);
  }, [activeCategory, recentEmojis]);

  const handleCategorySelect = useCallback((category: EmojiCategoryId) => {
    setActiveCategory(category);
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: TEmojiItem) => {
      onEmojiSelect(emoji);
      requestAnimationFrame(() => addRecent(emoji));
    },
    [addRecent, onEmojiSelect]
  );

  const effectiveCategory =
    activeCategory === 'recent' && !hasRecentEmojis
      ? 'people & body'
      : activeCategory;

  return (
    <div className="flex flex-col h-full">
      <CategoryBar
        activeCategory={effectiveCategory}
        onCategorySelect={handleCategorySelect}
        hasRecentEmojis={hasRecentEmojis}
      />

      <div className="px-3 py-2 text-xs font-medium text-[#8fa2bb]">
        {EMOJI_CATEGORIES.find((c) => c.id === effectiveCategory)?.label}
      </div>

      <div className="flex-1 min-h-0">
        <EmojiGrid emojis={displayEmojis} onSelect={handleEmojiSelect} />
      </div>
    </div>
  );
});

export { NativeEmojiTab };
