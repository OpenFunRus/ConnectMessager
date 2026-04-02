import { connect } from '@/features/server/actions';
import { useInfo } from '@/features/server/hooks';
import { getUrlFromServer } from '@/helpers/get-file-url';
import {
  getLocalStorageItem,
  LocalStorageKey,
  SessionStorageKey,
  setLocalStorageItem,
  setLocalStorageItemBool,
  setSessionStorageItem
} from '@/helpers/storage';
import { useForm } from '@/hooks/use-form';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  TestId
} from '@connectmessager/shared';
import {
  Button,
  Card,
  CardContent
} from '@connectmessager/ui';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';

type TLoginErrors = Partial<Record<'identity' | 'password' | 'name' | 'invite', string>>;
const INVITE_CODE_REGEX = /^[a-z0-9]{8}$/;
const AUTO_USER_ID_REGEX = /^[a-z0-9]{12}$/;
const AUTO_IDENTITY_REGEX = /^cm-user-[a-z0-9]{12}$/;
const toUserIdentity = (code: string) => `cm-user-${code}`;
const normalizeInviteCodeInput = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);

const generateRandomUserCode = () => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
};

type TLoginSuccessResponse = {
  token: string;
  identity?: string;
  ip?: string | null;
};

const Connect = memo(() => {
  const { values, errors, setErrors, onChange } = useForm<{
    inviteCode: string;
    displayName: string;
  }>({
    inviteCode: '',
    displayName: ''
  });

  const [loading, setLoading] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const info = useInfo();
  const isFirstRunSetup = info?.setupRequired ?? false;

  const finalizeLogin = useCallback(
    async (identity: string, token: string) => {
      const trimmedIdentity = identity.trim();
      setSessionStorageItem(SessionStorageKey.TOKEN, token);
      setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, true);
      setLocalStorageItem(LocalStorageKey.IDENTITY, trimmedIdentity);
      setLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN, token);
      setLocalStorageItem(LocalStorageKey.CM_USER_ID, trimmedIdentity);
      await connect();
    },
    []
  );

  const loginRequest = useCallback(async (payload: {
    identity: string;
    password: string;
    invite?: string;
    name?: string;
  }) => {
    const url = getUrlFromServer();
    return fetch(`${url}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }, []);

  const onInviteLogin = useCallback(async () => {
    setLoading(true);

    try {
      const code = values.inviteCode.trim().toLowerCase();
      if (!INVITE_CODE_REGEX.test(code)) {
        setErrors({
          inviteCode:
            'Код должен состоять из 8 символов: строчные буквы и цифры'
        });
        return;
      }

      const displayName = values.displayName.trim();

      const generatedUserCode = generateRandomUserCode();
      const storedIdentity = (
        getLocalStorageItem(LocalStorageKey.CM_USER_ID) || ''
      ).trim().toLowerCase();
      const identity = AUTO_IDENTITY_REGEX.test(storedIdentity)
        ? storedIdentity
        : toUserIdentity(generatedUserCode);
      if (!AUTO_IDENTITY_REGEX.test(storedIdentity)) {
        setLocalStorageItem(LocalStorageKey.CM_USER_ID, identity);
      }
      const isGeneratedCodeValid = AUTO_USER_ID_REGEX.test(generatedUserCode);
      if (!isGeneratedCodeValid) {
        throw new Error('Failed to generate user identity');
      }

      const response = await loginRequest({
        identity,
        password: code,
        invite: isFirstRunSetup ? undefined : code,
        name: isFirstRunSetup ? undefined : displayName || undefined
      });

      if (!response.ok) {
        const data = (await response.json()) as { errors?: TLoginErrors };
        const err = data.errors;
        const inviteError =
          (isFirstRunSetup
            ? err?.password || err?.identity || 'Неверный код доступа или пароль'
            : err?.invite || err?.identity || err?.password || 'Неверный код доступа или пароль');
        if (err?.name) {
          setErrors({
            displayName: err.name
          });
          setIsNameModalOpen(true);
        } else {
          setErrors({
            inviteCode: inviteError
          });
        }
        return;
      }

      const data = (await response.json()) as TLoginSuccessResponse;
      await finalizeLogin(data.identity || identity, data.token);
    } catch (error) {
      const rawErrorMessage =
        error instanceof Error ? error.message : String(error);
      const errorMessage =
        rawErrorMessage === 'Failed to fetch server info'
          ? 'Сервер временно недоступен'
          : rawErrorMessage;

      toast.error(`Не удалось подключиться: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [
    isFirstRunSetup,
    values.inviteCode,
    values.displayName,
    setErrors,
    loginRequest,
    finalizeLogin
  ]);

  const onMainSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await onInviteLogin();
    },
    [onInviteLogin]
  );
  return (
    <div className="h-full w-full overflow-y-auto bg-[#0b1220]">
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-[680px]">
          <Card className="rounded-[10px] border-[#2b3544] bg-[#182433] py-0 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <CardContent className="p-[22px]">
              <div className="mb-[18px] flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-[34px] w-[34px] shrink-0 text-[#cfe2ff]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10" />
                  <path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2" />
                </svg>
                <h1 className="m-0 text-[30px] font-bold leading-[1.1] text-[#dce9ff]">
                  Мессенджер Коннект
                </h1>
              </div>

              <form className="grid gap-3" onSubmit={onMainSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="connect-invite-code"
                    className="block text-[18px] leading-[1.4] text-[#d7e2f0]"
                  >
                    Введите код доступа или пароль
                  </label>
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        id="connect-invite-code"
                        type={showInviteCode ? 'text' : 'password'}
                        autoComplete="one-time-code"
                        placeholder="Запросите код доступа у куратора"
                        maxLength={8}
                        value={values.inviteCode}
                        onChange={(e) =>
                          onChange('inviteCode', normalizeInviteCodeInput(e.target.value))
                        }
                        onPaste={(event) => {
                          const pasted = event.clipboardData.getData('text');
                          if (!pasted) return;
                          event.preventDefault();
                          onChange('inviteCode', normalizeInviteCodeInput(pasted));
                        }}
                        data-testid={TestId.CONNECT_IDENTITY_INPUT}
                        className="h-11 w-full rounded-[6px] border border-[#314055] bg-[#172231] px-3 pr-12 text-[18px] text-white outline-none placeholder:text-[18px] placeholder:text-[#778ca9] focus:border-[#4c6687] focus:bg-[#1a2a3f] focus:ring-1 focus:ring-[rgba(76,102,135,0.35)]"
                      />
                      <button
                        type="button"
                        aria-label={
                          showInviteCode ? 'Скрыть вводимый код' : 'Показать вводимый код'
                        }
                        title={showInviteCode ? 'Скрыть' : 'Показать'}
                        onClick={() => setShowInviteCode((prev) => !prev)}
                        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-[#314055] bg-[#101926] text-[#b8c7db] hover:bg-[#162132] hover:text-white"
                      >
                        {showInviteCode ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path d="M3 3l18 18" />
                            <path d="M10.58 10.58a2 2 0 1 0 2.84 2.84" />
                            <path d="M9.88 5.09A9.81 9.81 0 0 1 12 4.9c5 0 9.27 3.11 11 7.1a11.76 11.76 0 0 1-1.67 2.68" />
                            <path d="M6.61 6.61A11.76 11.76 0 0 0 1 12c1.73 3.99 6 7.1 11 7.1a9.81 9.81 0 0 0 4.2-.9" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path d="M2.06 12C3.82 7.61 7.9 4.9 12 4.9c4.1 0 8.18 2.71 9.94 7.1-1.76 4.39-5.84 7.1-9.94 7.1-4.1 0-8.18-2.71-9.94-7.1z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.inviteCode && (
                      <p className="text-sm text-[#ff9ea0]" role="alert">
                        {errors.inviteCode}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  className="mt-1 h-11 w-full rounded-[6px] border border-[#3d79c2] bg-[linear-gradient(180deg,#2a77d0_0%,#206bc4_100%)] text-[18px] font-semibold text-[#f5f9ff] hover:brightness-110 disabled:border-[#314055] disabled:bg-[#223146] disabled:text-[#7f91a8]"
                  disabled={
                    loading ||
                    !values.inviteCode.trim()
                  }
                  data-testid={TestId.CONNECT_BUTTON}
                >
                  Войти
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,12,20,0.7)] backdrop-blur-sm p-4">
          <div className="w-full max-w-[560px] rounded-[10px] border border-[#314055] bg-[#101926] shadow-[0_26px_60px_rgba(2,6,23,0.65)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#314055] bg-[#172231] px-4 py-3">
              <h3 className="m-0 text-[20px] font-bold leading-[1.15] text-[#dce9ff]">
                Введите имя
              </h3>
              <button
                type="button"
                className="grid h-[34px] w-[34px] place-items-center rounded-[6px] border border-[#314055] bg-[#172231] text-[#c9d8ee] hover:bg-[#223146] hover:border-[#3d516b]"
                onClick={() => setIsNameModalOpen(false)}
                aria-label="Закрыть"
                title="Закрыть"
              >
                ×
              </button>
            </div>
            <div className="grid gap-3 p-[14px]">
              <p className="m-0 text-[14px] leading-[1.45] text-[#d7e2f0]">
                Укажите имя пользователя или адрес (например: Кирова 304а)
              </p>
              <input
                id="connect-display-name-modal"
                type="text"
                autoComplete="name"
                placeholder="Введите имя"
                maxLength={24}
                value={values.displayName}
                onChange={(e) => onChange('displayName', e.target.value)}
                className="h-11 w-full rounded-[6px] border border-[#314055] bg-[#172231] px-3 text-[18px] text-white outline-none placeholder:text-[18px] placeholder:text-[#778ca9] focus:border-[#4c6687] focus:bg-[#1a2a3f] focus:ring-1 focus:ring-[rgba(76,102,135,0.35)]"
              />
              {errors.displayName && (
                <p className="m-0 text-sm text-[#ff9ea0]" role="alert">
                  {errors.displayName}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="h-10 rounded-[6px] border border-[#2c75d2] bg-[#206bc4] px-4 text-[14px] font-semibold text-white hover:bg-[#2c75d2] disabled:opacity-60"
                  disabled={loading || !values.displayName.trim()}
                  onClick={async () => {
                    const nextName = values.displayName.trim();
                    if (!nextName) {
                      setErrors({ displayName: 'Введите имя пользователя' });
                      return;
                    }
                    if (nextName.length > 24) {
                      setErrors({ displayName: 'Имя должно быть не длиннее 24 символов' });
                      return;
                    }
                    if (nextName === DELETED_USER_IDENTITY_AND_NAME) {
                      setErrors({ displayName: 'Это имя недоступно' });
                      return;
                    }
                    setIsNameModalOpen(false);
                    await onInviteLogin();
                  }}
                >
                  Сохранить и войти
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export { Connect };


