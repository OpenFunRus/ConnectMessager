import { getFileThumbnailUrl, getFileUrl } from '@/helpers/get-file-url';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './icon';
import type { TMessageImageThumbnailProps } from '../types';

const MessageImageThumbnail = memo(
  ({ file, onOpen, onDownload }: TMessageImageThumbnailProps) => {
    const [thumbnailReady, setThumbnailReady] = useState(false);
    const [useOriginalFallback, setUseOriginalFallback] = useState(false);

    const sourceUrl = useMemo(
      () => getFileUrl(file, { includeVersion: false }),
      [file]
    );
    const thumbnailBaseUrl = useMemo(() => getFileThumbnailUrl(file), [file]);

    useEffect(() => {
      setThumbnailReady(false);
      setUseOriginalFallback(false);
    }, [thumbnailBaseUrl]);

    const handleImageLoad = useCallback(() => {
      setThumbnailReady(true);
    }, []);

    const handleImageError = useCallback(() => {
      if (useOriginalFallback) {
        setThumbnailReady(true);
        return;
      }
      setUseOriginalFallback(true);
      setThumbnailReady(false);
    }, [useOriginalFallback]);

    const imageSrc = useOriginalFallback ? sourceUrl : thumbnailBaseUrl;

    return (
      <div className="cmx-message-file-image-wrap">
        {!thumbnailReady && <div className="cmx-message-file-thumb-skeleton" />}
        <button
          type="button"
          className={`cmx-message-file-image-link cmx-message-file-image-btn ${thumbnailReady ? '' : 'loading'}`.trim()}
          title={file.originalName}
          onClick={() => onOpen(file)}
        >
          <img
            key={useOriginalFallback ? 'original' : 'thumb'}
            src={imageSrc}
            alt={file.originalName}
            className="cmx-message-file-image"
            loading="lazy"
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </button>
        <button
          type="button"
          className="cmx-icon-btn cmx-message-file-download-btn"
          title="Скачать"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDownload(file);
          }}
        >
          <Icon name="download" className="cmx-message-file-download-icon" />
        </button>
      </div>
    );
  }
);

export { MessageImageThumbnail };
