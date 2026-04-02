const stripToText = (
  html: string,
  preProcess?: ((html: string) => string)[]
): string => {
  let result = html;

  if (preProcess) {
    for (const fn of preProcess) {
      result = fn(result);
    }
  }

  return result
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
};

const removeProseMirrorArtifacts = (html: string): string =>
  html
    .replace(/<img[^>]*ProseMirror-separator[^>]*>/gi, '')
    .replace(/<br[^>]*ProseMirror-trailingBreak[^>]*>/gi, '');

const removeEmojiElements = (html: string): string =>
  html
    .replace(/<span[^>]*data-type="emoji"[^>]*>.*?<\/span>/gi, '')
    .replace(/<img[^>]*class="emoji-image"[^>]*\/?>/gi, '');

const MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT = 1024;
const MESSAGE_DEFAULT_LINES_LIMIT = 32;
const MESSAGE_MIN_TEXT_LENGTH_LIMIT = 1;
const MESSAGE_MIN_LINES_LIMIT = 1;
const MESSAGE_MAX_TEXT_LENGTH = 4096;
const MESSAGE_MAX_LINES = 200;

const hasMediaTag = (html: string): boolean =>
  /<(img|video|audio|iframe)\b/i.test(html);

const hasEmojiElement = (html: string): boolean =>
  /<span[^>]*data-type="emoji"[^>]*>/.test(html) ||
  /<img[^>]*class="emoji-image"[^>]*>/.test(html);

const isEmptyMessage = (content: string | undefined | null): boolean => {
  if (!content) return true;

  const cleaned = removeProseMirrorArtifacts(content);
  const hasMedia = hasMediaTag(cleaned);
  const hasText = stripToText(cleaned).length > 0;

  return !hasText && !hasMedia;
};

const isEmojiOnlyMessage = (content: string | undefined | null): boolean => {
  if (!content) return false;

  if (!hasEmojiElement(content)) return false;

  return stripToText(content, [removeEmojiElements]).length === 0;
};

const getPlainTextFromHtml = (html: string): string => {
  return stripToText(html, [removeProseMirrorArtifacts, removeEmojiElements]);
};

const extractValidationText = (content: string | undefined | null): string => {
  if (!content) {
    return '';
  }

  return (
    content
      .replace(/<img[^>]*class="ProseMirror-separator"[^>]*>/gi, '')
      .replace(/<br[^>]*class="ProseMirror-trailingBreak"[^>]*>/gi, '')
      // count emojis as text so they are not a bypass for char/line limits
      .replace(/<span[^>]*data-type="emoji"[^>]*>.*?<\/span>/gi, 'e')
      .replace(/<img[^>]*class="emoji-image"[^>]*\/?>/gi, 'e')
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<\/(p|div|li|blockquote|pre|h[1-6])>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()
  );
};

const getMessageTextMetrics = (content: string | undefined | null) => {
  const normalized = extractValidationText(content);

  if (!normalized) {
    return {
      textLength: 0,
      lineCount: 0
    };
  }

  return {
    textLength: normalized.length,
    lineCount: normalized.split('\n').length
  };
};

const getMessageContentLimitError = (
  content: string | undefined | null,
  limits?: {
    textLengthLimit?: number;
    linesLimit?: number;
  }
): 'MAX_LENGTH' | 'MAX_LINES' | null => {
  const { textLength, lineCount } = getMessageTextMetrics(content);
  const textLengthLimit =
    limits?.textLengthLimit ?? MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT;
  const linesLimit = limits?.linesLimit ?? MESSAGE_DEFAULT_LINES_LIMIT;

  if (textLength > textLengthLimit) {
    return 'MAX_LENGTH';
  }

  if (lineCount > linesLimit) {
    return 'MAX_LINES';
  }

  return null;
};

export {
  MESSAGE_DEFAULT_LINES_LIMIT,
  MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
  MESSAGE_MAX_LINES,
  MESSAGE_MAX_TEXT_LENGTH,
  MESSAGE_MIN_LINES_LIMIT,
  MESSAGE_MIN_TEXT_LENGTH_LIMIT,
  getMessageContentLimitError,
  getMessageTextMetrics,
  getPlainTextFromHtml,
  isEmojiOnlyMessage,
  isEmptyMessage
};
