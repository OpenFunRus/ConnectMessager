import { FullScreenImage } from '@/components/fullscreen-image/content';
import { cn } from '@/lib/utils';
import { Skeleton } from '@connectmessager/ui';
import { Download, Trash } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TImageOverrideProps = {
  src: string;
  alt?: string;
  title?: string;
  onRemove?: () => void;
};

const ImageOverride = memo(({ src, alt, onRemove }: TImageOverrideProps) => {
  const { t } = useTranslation('common');
  const thumbnailBaseSrc = useMemo(() => {
    if (!URL.canParse(src)) {
      return src;
    }

    const parsed = new URL(src);
    parsed.searchParams.set('thumb', '1');
    return parsed.toString();
  }, [src]);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [thumbnailAttempt, setThumbnailAttempt] = useState(0);
  const [thumbnailReady, setThumbnailReady] = useState(false);
  const thumbnailSrc = useMemo(() => {
    if (!URL.canParse(thumbnailBaseSrc)) {
      return thumbnailBaseSrc;
    }

    const parsed = new URL(thumbnailBaseSrc);
    parsed.searchParams.set('_thumbTry', String(thumbnailAttempt));
    return parsed.toString();
  }, [thumbnailAttempt, thumbnailBaseSrc]);

  useEffect(() => {
    setThumbnailAttempt(0);
    setThumbnailReady(false);
  }, [thumbnailBaseSrc]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleThumbnailLoad = useCallback(() => {
    setThumbnailReady(true);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const handleThumbnailError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      setThumbnailAttempt((prev) => prev + 1);
    }, 1200);
  }, []);

  return (
    <div className="relative w-full min-w-0 overflow-hidden rounded-xl">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <a
          href={src}
          download
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#314055] bg-[#172231]/92 text-[#d7e2f0] shadow-[0_12px_28px_rgba(2,6,23,0.35)] transition-colors hover:border-[#4a6280] hover:bg-[#1b2940]"
          title={t('download')}
          aria-label={t('download')}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-[#314055] bg-[#172231]/92 text-[#d7e2f0] shadow-[0_12px_28px_rgba(2,6,23,0.35)] transition-colors hover:border-[#4a6280] hover:bg-[#1b2940]"
          title={t('deleteLabel')}
          aria-label={t('deleteLabel')}
        >
          <Trash className="h-4 w-4" />
        </button>
      )}
      <div className="relative w-full min-w-0 overflow-hidden rounded-xl">
        {!thumbnailReady && (
          <div className="absolute inset-0">
            <Skeleton className="aspect-[4/3] w-full" />
          </div>
        )}
        <FullScreenImage
          src={thumbnailSrc}
          fullscreenSrc={src}
          alt={alt}
          className={cn(
            'h-auto w-full rounded-xl object-left-top',
            !thumbnailReady && 'opacity-0'
          )}
          crossOrigin="anonymous"
          loading="lazy"
          decoding="async"
          onLoad={handleThumbnailLoad}
          onError={handleThumbnailError}
        />
      </div>
    </div>
  );
});

export { ImageOverride };


