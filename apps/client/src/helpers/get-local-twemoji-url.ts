import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import emojiDatasource from 'emoji-datasource-twitter';
import type { EmojiItem } from '@tiptap/extension-emoji';
import twemoji from 'twemoji';

type TStandardEmojiCategory =
  | 'people & body'
  | 'animals & nature'
  | 'food & drink'
  | 'activities'
  | 'travel & places'
  | 'objects'
  | 'symbols'
  | 'flags';

type TEmojiDatasourceRecord = {
  short_name: string;
  short_names?: string[];
  text?: string | null;
  texts?: string[] | null;
  category: string;
  image: string;
  unified: string;
  sort_order: number;
  has_img_twitter: boolean;
};

const LOCAL_TWEMOJI_BASE_PATH = '/twemoji';

const DATASOURCE_CATEGORY_MAP: Record<string, TStandardEmojiCategory | undefined> = {
  'Smileys & Emotion': 'people & body',
  'People & Body': 'people & body',
  'Animals & Nature': 'animals & nature',
  'Food & Drink': 'food & drink',
  Activities: 'activities',
  'Travel & Places': 'travel & places',
  Objects: 'objects',
  Symbols: 'symbols',
  Flags: 'flags'
};

const toUniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      values
        .filter((value): value is string => !!value?.trim())
        .map((value) => value.trim())
    )
  );

const normalizeTwemojiFileName = (value: string) => value.toLowerCase();
const normalizeTwemojiIcon = (icon: string) =>
  icon
    .split('-')
    .map((part) => (part.length < 4 ? part.padStart(4, '0') : part))
    .join('-');

const getTwemojiFileName = ({
  fallbackImage,
  image
}: {
  fallbackImage?: string;
  image?: string;
}) => {
  const fileNameFromFallback = fallbackImage
    ?.split('?')[0]
    ?.split('/')
    ?.pop();

  return normalizeTwemojiFileName(image ?? fileNameFromFallback ?? '');
};

const getLocalTwemojiUrlByImage = (image?: string) => {
  const fileName = getTwemojiFileName({ image });

  return fileName ? `${LOCAL_TWEMOJI_BASE_PATH}/${fileName}` : undefined;
};

const unifiedToEmoji = (unified: string) =>
  unified
    .split('-')
    .map((part) => twemoji.convert.fromCodePoint(part.toLowerCase()))
    .join('');

const datasource = emojiDatasource as TEmojiDatasourceRecord[];

const STANDARD_TWEMOJI_EMOJIS: EmojiItem[] = datasource
  .filter(
    (emoji) => !!DATASOURCE_CATEGORY_MAP[emoji.category] && emoji.has_img_twitter
  )
  .sort((a, b) => a.sort_order - b.sort_order)
  .map((emoji) => ({
    name: emoji.short_name,
    shortcodes: toUniqueStrings([emoji.short_name, ...(emoji.short_names ?? [])]),
    tags: [],
    group: DATASOURCE_CATEGORY_MAP[emoji.category]!,
    emoji: unifiedToEmoji(emoji.unified),
    emoticons: toUniqueStrings([emoji.text, ...(emoji.texts ?? [])]),
    fallbackImage: getLocalTwemojiUrlByImage(emoji.image)
  }));

const LOCAL_TWEMOJI_IMAGE_SET = new Set(
  STANDARD_TWEMOJI_EMOJIS.map((emoji) =>
    getTwemojiFileName({ fallbackImage: emoji.fallbackImage })
  ).filter(Boolean)
);

const STANDARD_TWEMOJI_LOOKUP = new Map<string, TEmojiItem>();

for (const emoji of STANDARD_TWEMOJI_EMOJIS) {
  STANDARD_TWEMOJI_LOOKUP.set(emoji.name, emoji);

  if (emoji.emoji) {
    STANDARD_TWEMOJI_LOOKUP.set(emoji.emoji, emoji);
  }

  emoji.shortcodes.forEach((shortcode) => {
    STANDARD_TWEMOJI_LOOKUP.set(shortcode, emoji);
  });
}

const findStandardTwemojiEmoji = (value: string) =>
  STANDARD_TWEMOJI_LOOKUP.get(value);

const getLocalTwemojiUrl = ({
  fallbackImage,
  image
}: {
  fallbackImage?: string;
  image?: string;
}) => {
  const fileName = getTwemojiFileName({ fallbackImage, image });

  if (!fileName || !LOCAL_TWEMOJI_IMAGE_SET.has(fileName)) {
    return undefined;
  }

  return `${LOCAL_TWEMOJI_BASE_PATH}/${fileName}`;
};

const getLocalTwemojiUrlByIcon = (icon: string) => {
  const fileName = normalizeTwemojiFileName(
    `${normalizeTwemojiIcon(twemoji.convert.toCodePoint(icon))}.png`
  );

  if (!LOCAL_TWEMOJI_IMAGE_SET.has(fileName)) {
    return undefined;
  }

  return `${LOCAL_TWEMOJI_BASE_PATH}/${fileName}`;
};

export {
  findStandardTwemojiEmoji,
  getLocalTwemojiUrl,
  getLocalTwemojiUrlByIcon,
  STANDARD_TWEMOJI_EMOJIS
};
