type TUserNameLike = {
  name?: string | null;
  identity?: string | null;
};

const AUTO_USER_ID_PREFIX = 'cm-user-';

const hasTemporaryUserName = (user: TUserNameLike | null | undefined) => {
  if (!user) return false;

  const name = (user.name || '').trim().toLowerCase();
  const identity = (user.identity || '').trim().toLowerCase();

  if (!name && !identity) return false;

  return (
    name.startsWith(AUTO_USER_ID_PREFIX) ||
    identity.startsWith(AUTO_USER_ID_PREFIX) ||
    (!!name && !!identity && name === identity)
  );
};

export { hasTemporaryUserName };
