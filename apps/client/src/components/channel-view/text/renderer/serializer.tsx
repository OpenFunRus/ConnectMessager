import { imageExtensions, parseDomCommand } from '@connectmessager/shared';
import { Element, type DOMNode } from 'html-react-parser';
import { CommandOverride } from '../overrides/command';
import { MentionOverride } from '../overrides/mention';
import { TwitterOverride } from '../overrides/twitter';
import { YoutubeOverride } from '../overrides/youtube';
import type { TFoundMedia } from './types';

const twitterRegex = /https:\/\/(twitter|x).com\/\w+\/status\/(\d+)/g;
const youtubeRegex =
  /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;

const getMentionLabel = (element: Element) =>
  element.children
    .map((child) =>
      'data' in child && typeof child.data === 'string' ? child.data : ''
    )
    .join('')
    .replace(/^@/, '')
    .trim();

const isImageUrl = (href: string) => {
  if (!URL.canParse(href)) {
    return false;
  }

  const parsed = new URL(href);
  const pathname = parsed.pathname.toLowerCase();

  return imageExtensions.some((ext) => pathname.endsWith(ext));
};

const isTenorUrl = (href: string) => {
  if (!URL.canParse(href)) {
    return false;
  }

  const hostname = new URL(href).hostname.toLowerCase();

  return hostname.includes('tenor.com');
};

const serializer = (
  domNode: DOMNode,
  pushMedia: (media: TFoundMedia) => void,
  messageId: number
) => {
  try {
    if (domNode instanceof Element && domNode.name === 'a') {
      const href = domNode.attribs.href;

      if (!URL.canParse(href)) {
        return null;
      }

      const url = new URL(href);

      const isTweet =
        url.hostname.match(/(twitter|x).com/) && href.match(twitterRegex);
      const isYoutube =
        url.hostname.match(/(youtube.com|youtu.be)/) &&
        href.match(youtubeRegex);

      const isImage = isImageUrl(href);

      if (isTweet) {
        const tweetId = href.match(twitterRegex)?.[0].split('/').pop();

        if (tweetId) {
          return <TwitterOverride tweetId={tweetId} />;
        }
      } else if (isYoutube) {
        const videoId = href.match(
          /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
        )?.[7];

        if (videoId) {
          return <YoutubeOverride videoId={videoId} />;
        }
      } else if (isImage) {
        pushMedia({ type: 'image', url: href });

        // hide raw Tenor URL in chat body and render only GIF media block
        if (isTenorUrl(href)) {
          return <></>;
        }

        return;
      }
    } else if (domNode instanceof Element && domNode.name === 'command') {
      const command = parseDomCommand(domNode);

      return <CommandOverride command={command} />;
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'mention' &&
      domNode.attribs['data-user-id']
    ) {
      const userId = parseInt(domNode.attribs['data-user-id'], 10);
      const label = getMentionLabel(domNode);

      if (!Number.isNaN(userId)) {
        return <MentionOverride userId={userId} label={label || undefined} />;
      }
    }
  } catch (error) {
    console.error(`Error parsing DOM node for message ID ${messageId}:`, error);
  }

  return null;
};

export { serializer };


