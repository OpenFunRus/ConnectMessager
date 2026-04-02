import { loadApp } from '@/features/app/actions';
import { useStrictEffect } from '@/hooks/use-strict-effect';
import { Button, Spinner } from '@connectmessager/ui';
import { RefreshCw } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

type TLoadingApp = {
  text: string;
  autoReconnectAt?: number | null;
};

const LoadingApp = memo(({ text = 'Loading', autoReconnectAt = null }: TLoadingApp) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useStrictEffect(() => {
    loadApp();
  }, []);

  useEffect(() => {
    if (!autoReconnectAt) {
      setSecondsLeft(null);
      return;
    }

    const update = () => {
      const diffMs = autoReconnectAt - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(diffMs / 1000)));
    };

    update();
    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, [autoReconnectAt]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1220] px-6 py-10 text-[#d7e2f0]">
      <div className="w-full max-w-md rounded-2xl border border-[#2b3544] bg-[#182433] px-6 py-8 text-center shadow-[0_30px_80px_rgba(3,8,20,0.55)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <Spinner size="lg" />
        </div>
        <h1 className="text-[28px] font-semibold leading-tight text-white">
          {text}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9fb2c8]">
          Ожидание подключения к серверу...
        </p>
        {secondsLeft !== null && (
          <p className="mt-2 text-sm leading-relaxed text-[#8fa2bb]">
            Следующая попытка через {secondsLeft} сек.
          </p>
        )}
        <Button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg border border-[#2f7ad1] bg-[#206bc4] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-[#3b82d6] hover:bg-[#1b5dab]"
        >
          <RefreshCw className="h-4 w-4" />
          Обновить страницу
        </Button>
      </div>
    </div>
  );
});

export { LoadingApp };


