import {
  fetchServerInfo,
  setAutoReconnectAt,
  setIsAutoConnecting
} from '@/features/app/actions';
import { useIsAppLoading, useIsPluginsLoading } from '@/features/app/hooks';
import { connect, setDisconnectInfo, setInfo } from '@/features/server/actions';
import { useDisconnectInfo, useIsConnected } from '@/features/server/hooks';
import { getUrlFromServer } from '@/helpers/get-file-url';
import {
  getLocalStorageItem,
  getLocalStorageItemBool,
  LocalStorageKey,
  removeLocalStorageItem,
  SessionStorageKey,
  setLocalStorageItem,
  setLocalStorageItemBool,
  setSessionStorageItem
} from '@/helpers/storage';
import { DisconnectCode } from '@connectmessager/shared';
import { memo, useEffect, useRef } from 'react';

type TRestoreLoginResponse = {
  token: string;
  identity: string;
  ip: string | null;
};

const AutoLoginController = memo(() => {
  const FIRST_RETRY_MIN_SECONDS = 1;
  const FIRST_RETRY_MAX_SECONDS = 60;
  const NEXT_RETRY_DELAY_MS = 60000;
  const isConnected = useIsConnected();
  const isAppLoading = useIsAppLoading();
  const isPluginsLoading = useIsPluginsLoading();
  const disconnectInfo = useDisconnectInfo();
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoreInProgress = useRef(false);
  const isFirstRetryRef = useRef(true);

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('timeout'));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  };

  useEffect(() => {
    if (isAppLoading || isPluginsLoading) {
      return;
    }

    if (isConnected) {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
        retryTimeout.current = null;
      }
      isFirstRetryRef.current = true;
      setAutoReconnectAt(null);
      setIsAutoConnecting(false);
      return;
    }

    if (
      disconnectInfo &&
      (disconnectInfo.code === DisconnectCode.KICKED ||
        disconnectInfo.code === DisconnectCode.BANNED)
    ) {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
        retryTimeout.current = null;
      }
      isFirstRetryRef.current = true;
      setAutoReconnectAt(null);
      setIsAutoConnecting(false);
      return;
    }

    const autoLoginEnabled = getLocalStorageItemBool(
      LocalStorageKey.AUTO_LOGIN
    );
    const savedIdentity = getLocalStorageItem(LocalStorageKey.CM_USER_ID);
    const savedIp = getLocalStorageItem(LocalStorageKey.CM_USER_IP);

    if (!autoLoginEnabled || !savedIdentity || !savedIp) {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
        retryTimeout.current = null;
      }
      isFirstRetryRef.current = true;
      setAutoReconnectAt(null);
      setIsAutoConnecting(false);
      setDisconnectInfo(undefined);
      return;
    }

    setIsAutoConnecting(true);

    let cancelled = false;

    const getNextRetryDelayMs = () => {
      if (isFirstRetryRef.current) {
        isFirstRetryRef.current = false;
        const seconds =
          Math.floor(
            Math.random() * (FIRST_RETRY_MAX_SECONDS - FIRST_RETRY_MIN_SECONDS + 1)
          ) + FIRST_RETRY_MIN_SECONDS;
        return seconds * 1000;
      }

      return NEXT_RETRY_DELAY_MS;
    };

    const scheduleRetry = (delayMs = getNextRetryDelayMs()) => {
      if (cancelled) {
        return;
      }
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
      setAutoReconnectAt(Date.now() + delayMs);
      retryTimeout.current = setTimeout(() => {
        retryTimeout.current = null;
        setAutoReconnectAt(null);
        void tryRestore();
      }, delayMs);
    };

    const tryRestore = async () => {
      if (cancelled || isConnected || isRestoreInProgress.current) {
        return;
      }

      isRestoreInProgress.current = true;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`${getUrlFromServer()}/login/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            identity: savedIdentity,
            ip: savedIp
          }),
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        if (!response.ok) {
          let reason = 'restore-login-failed';
          try {
            const errorData = (await response.json()) as {
              errors?: Partial<Record<'ip' | 'identity', string>>;
            };
            if (errorData.errors?.ip) {
              reason = 'ip-mismatch';
            }
            if (errorData.errors?.identity) {
              reason = 'identity-invalid';
            }
          } catch {
            // ignore body parse errors for retry flow
          }
          throw new Error(reason);
        }

        const data = (await response.json()) as TRestoreLoginResponse;

        setSessionStorageItem(SessionStorageKey.TOKEN, data.token);
        setLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN, data.token);
        if (data.ip) {
          setLocalStorageItem(LocalStorageKey.CM_USER_IP, data.ip);
        }

        const info = await fetchServerInfo();
        if (info) {
          setInfo(info);
        }

        await withTimeout(connect(), 10000);
        setDisconnectInfo(undefined);
        setIsAutoConnecting(false);
        isFirstRetryRef.current = true;
        setAutoReconnectAt(null);
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : 'unknown-error';

        if (reason === 'ip-mismatch' || reason === 'identity-invalid') {
          removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
          removeLocalStorageItem(LocalStorageKey.CM_USER_ID);
          removeLocalStorageItem(LocalStorageKey.CM_USER_IP);
          setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, false);
          setDisconnectInfo(undefined);
          setIsAutoConnecting(false);
          isFirstRetryRef.current = true;
          setAutoReconnectAt(null);
          return;
        }

        // Server is unavailable: keep retrying indefinitely until it comes back.
        setIsAutoConnecting(true);
        scheduleRetry();
      } finally {
        isRestoreInProgress.current = false;
      }
    };

    if (disconnectInfo) {
      scheduleRetry();
    } else {
      void tryRestore();
    }

    return () => {
      cancelled = true;
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
        retryTimeout.current = null;
      }
      setAutoReconnectAt(null);
    };
  }, [isAppLoading, isPluginsLoading, isConnected, disconnectInfo]);

  return null;
});

export { AutoLoginController };
