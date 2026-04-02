import { findStandardEmoji } from '@/components/emoji-picker/emoji-data';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { getLocalTwemojiUrlByIcon } from '@/helpers/get-local-twemoji-url';
import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { Fragment } from 'react';

const INLINE_EMOJI_CLASS =
  'inline-block h-[1.15em] w-[1.15em] align-[-0.2em]';
const CUSTOM_EMOJI_TOKEN_REGEX = /:([a-z0-9_+-]+):/gi;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildCustomEmojiMap = (customEmojis: TEmojiItem[]) =>
  new Map(
    customEmojis
      .filter((emoji) => !!emoji.fallbackImage)
      .map((emoji) => [emoji.name, emoji.fallbackImage!])
  );

const getCanonicalEmojiText = (
  name: string,
  customEmojiMap: Map<string, string>
) => {
  if (customEmojiMap.has(name)) {
    return `:${name}:`;
  }

  return findStandardEmoji(name)?.emoji ?? `:${name}:`;
};

const canonicalizeMessageEmojiHtml = (
  html: string,
  customEmojis: TEmojiItem[]
) => {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const customEmojiMap = buildCustomEmojiMap(customEmojis);

  doc.querySelectorAll('span[data-type="emoji"]').forEach((node) => {
    const name = node.getAttribute('data-name')?.trim();

    if (!name) return;

    node.replaceWith(doc.createTextNode(getCanonicalEmojiText(name, customEmojiMap)));
  });

  return doc.body.innerHTML;
};

const renderUnicodeEmojiHtml = (text: string) =>
  twemoji.parse(escapeHtml(text), {
    callback: (icon) => getLocalTwemojiUrlByIcon(icon) || false,
    attributes: (rawText) => ({
      class: INLINE_EMOJI_CLASS,
      'data-emoji-text': rawText
    })
  });

const renderMessageTextWithEmojis = (
  text: string,
  customEmojis: TEmojiItem[],
  key: string
) => {
  if (!text) return null;

  const customEmojiMap = buildCustomEmojiMap(customEmojis);
  let html = '';
  let lastIndex = 0;
  let hasEmojiReplacement = false;

  for (const match of text.matchAll(CUSTOM_EMOJI_TOKEN_REGEX)) {
    const token = match[0];
    const name = match[1];
    const index = match.index ?? -1;

    if (index < 0) continue;

    const textBefore = text.slice(lastIndex, index);

    if (textBefore) {
      const renderedTextBefore = renderUnicodeEmojiHtml(textBefore);
      hasEmojiReplacement ||= renderedTextBefore.includes('<img');
      html += renderedTextBefore;
    }

    const customEmojiUrl = customEmojiMap.get(name);
    const standardEmoji = findStandardEmoji(name);

    if (customEmojiUrl) {
      hasEmojiReplacement = true;
      html += `<img src="${escapeHtml(customEmojiUrl)}" alt="${escapeHtml(token)}" data-emoji-token="${escapeHtml(token)}" class="${INLINE_EMOJI_CLASS} rounded-sm" draggable="false" loading="lazy" />`;
    } else if (standardEmoji?.fallbackImage) {
      hasEmojiReplacement = true;
      html += `<img src="${escapeHtml(standardEmoji.fallbackImage)}" alt="${escapeHtml(token)}" data-emoji-token="${escapeHtml(token)}" class="${INLINE_EMOJI_CLASS}" draggable="false" loading="lazy" />`;
    } else if (standardEmoji?.emoji) {
      const renderedStandardEmoji = renderUnicodeEmojiHtml(standardEmoji.emoji);
      hasEmojiReplacement ||= renderedStandardEmoji.includes('<img');
      html += renderedStandardEmoji;
    } else {
      html += escapeHtml(token);
    }

    lastIndex = index + token.length;
  }

  const textAfter = text.slice(lastIndex);

  if (textAfter) {
    const renderedTextAfter = renderUnicodeEmojiHtml(textAfter);
    hasEmojiReplacement ||= renderedTextAfter.includes('<img');
    html += renderedTextAfter;
  }

  if (!hasEmojiReplacement) {
    return null;
  }

  return <Fragment key={key}>{parse(html)}</Fragment>;
};

const getClipboardTextFromRenderedEmojiHtml = (
  html: string,
  customEmojis: TEmojiItem[]
) => {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const customEmojiMap = buildCustomEmojiMap(customEmojis);

  doc.querySelectorAll('span[data-type="emoji"]').forEach((node) => {
    const name = node.getAttribute('data-name')?.trim();

    if (!name) return;

    node.replaceWith(doc.createTextNode(getCanonicalEmojiText(name, customEmojiMap)));
  });

  doc.querySelectorAll('img').forEach((node) => {
    const token =
      node.getAttribute('data-emoji-token') ??
      node.getAttribute('data-emoji-text') ??
      '';

    if (!token) return;

    node.replaceWith(doc.createTextNode(token));
  });

  return (doc.body.innerText || doc.body.textContent || '').replace(/\r\n/g, '\n');
};

const getEmojiOnlyCount = (html: string | null | undefined, customEmojis: TEmojiItem[]) => {
  if (!html || typeof DOMParser === 'undefined') {
    return 0;
  }

  const canonicalHtml = canonicalizeMessageEmojiHtml(html, customEmojis);
  const parser = new DOMParser();
  const doc = parser.parseFromString(canonicalHtml, 'text/html');
  const plainText = doc.body.textContent ?? '';

  if (!plainText.trim()) {
    return 0;
  }

  const customEmojiMap = buildCustomEmojiMap(customEmojis);
  let customEmojiCount = 0;
  let standardEmojiCount = 0;
  const withoutCustomTokens = plainText.replace(
    CUSTOM_EMOJI_TOKEN_REGEX,
    (match, name: string) => {
      if (customEmojiMap.has(name)) {
        customEmojiCount += 1;
        return '';
      }

      if (findStandardEmoji(name)?.emoji) {
        standardEmojiCount += 1;
        return '';
      }

      return match;
    }
  );
  const unicodeHtml = renderUnicodeEmojiHtml(withoutCustomTokens);
  const unicodeEmojiCount = (unicodeHtml.match(/<img\b[^>]*>/g) ?? []).length;
  const withoutUnicodeImages = unicodeHtml.replace(/<img[^>]*>/g, '');
  const unicodeDoc = parser.parseFromString(withoutUnicodeImages, 'text/html');
  const remainingText = unicodeDoc.body.textContent ?? '';

  return remainingText.trim().length === 0
    ? customEmojiCount + standardEmojiCount + unicodeEmojiCount
    : 0;
};

const isEmojiOnlyHtml = (html: string | null | undefined, customEmojis: TEmojiItem[]) => {
  return getEmojiOnlyCount(html, customEmojis) > 0;
};

export {
  canonicalizeMessageEmojiHtml,
  getClipboardTextFromRenderedEmojiHtml,
  getEmojiOnlyCount,
  isEmojiOnlyHtml,
  renderMessageTextWithEmojis
};
