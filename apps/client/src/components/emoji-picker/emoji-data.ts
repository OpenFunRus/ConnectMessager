import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import {
  findStandardTwemojiEmoji,
  STANDARD_TWEMOJI_EMOJIS
} from '@/helpers/get-local-twemoji-url';

const EMOJI_CATEGORIES = [
  { id: 'recent', label: 'Recent', icon: '🕐' },
  { id: 'people & body', label: 'People', icon: '😀' },
  { id: 'animals & nature', label: 'Nature', icon: '🐻' },
  { id: 'food & drink', label: 'Food', icon: '🍕' },
  { id: 'activities', label: 'Activities', icon: '⚽' },
  { id: 'travel & places', label: 'Travel', icon: '✈️' },
  { id: 'objects', label: 'Objects', icon: '💡' },
  { id: 'symbols', label: 'Symbols', icon: '💕' },
  { id: 'flags', label: 'Flags', icon: '🏳️' }
];

type EmojiCategoryId = (typeof EMOJI_CATEGORIES)[number]['id'];

const toTEmojiItem = (emoji: TEmojiItem): TEmojiItem => ({
  name: emoji.name,
  shortcodes: emoji.shortcodes,
  fallbackImage: emoji.fallbackImage,
  emoji: emoji.emoji
});

const processEmojis = () => {
  const grouped: Record<string, TEmojiItem[]> = {};
  const all: TEmojiItem[] = [];

  for (const category of EMOJI_CATEGORIES) {
    grouped[category.id] = [];
  }

  for (const emoji of STANDARD_TWEMOJI_EMOJIS) {
    const converted = toTEmojiItem(emoji);
    const categoryGroup = emoji.group;

    if (categoryGroup && grouped[categoryGroup]) {
      grouped[categoryGroup].push(converted);
      all.push(converted);
    }
  }

  return { grouped, all };
};

const { grouped: GROUPED_EMOJIS, all: ALL_EMOJIS } = processEmojis();
const findStandardEmoji = (value: string) => findStandardTwemojiEmoji(value);

const searchEmojis = (emojis: TEmojiItem[], query: string): TEmojiItem[] => {
  if (!query.trim()) return emojis;

  const lowerQuery = query.toLowerCase();

  return emojis.filter(
    (emoji) =>
      emoji.name.toLowerCase().includes(lowerQuery) ||
      emoji.shortcodes.some((sc) => sc.toLowerCase().includes(lowerQuery))
  );
};

const getEmojisByCategory = (categoryId: EmojiCategoryId): TEmojiItem[] =>
  GROUPED_EMOJIS[categoryId] || [];

const GRID_COLS = 8;
const EMOJI_SIZE = 32; // px
const ROW_HEIGHT = 36; // px (emoji size + gap)

export {
  ALL_EMOJIS,
  EMOJI_CATEGORIES,
  EMOJI_SIZE,
  findStandardEmoji,
  getEmojisByCategory,
  GRID_COLS,
  GROUPED_EMOJIS,
  ROW_HEIGHT,
  searchEmojis,
  toTEmojiItem,
  type EmojiCategoryId
};
