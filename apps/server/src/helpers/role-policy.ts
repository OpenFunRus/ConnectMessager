import {
  createDefaultRoleAbilities,
  createDefaultRoleLimits,
  type TJoinedRole,
  type TRoleAbilities,
  type TRoleLimits
} from '@connectmessager/shared';

const normalizeRoleLimits = (
  limits?: Partial<TRoleLimits> | null
): TRoleLimits => {
  const defaults = createDefaultRoleLimits();

  return {
    messagesPerMinute: {
      ...defaults.messagesPerMinute,
      ...(limits?.messagesPerMinute ?? {})
    },
    requestsPerMinute: {
      ...defaults.requestsPerMinute,
      ...(limits?.requestsPerMinute ?? {})
    },
    charsPerMessage: {
      ...defaults.charsPerMessage,
      ...(limits?.charsPerMessage ?? {})
    },
    linesPerMessage: {
      ...defaults.linesPerMessage,
      ...(limits?.linesPerMessage ?? {})
    },
    fileSizeMb: {
      ...defaults.fileSizeMb,
      ...(limits?.fileSizeMb ?? {})
    },
    filesPerMessage: {
      ...defaults.filesPerMessage,
      ...(limits?.filesPerMessage ?? {})
    },
    fileFormats: {
      ...defaults.fileFormats,
      ...(limits?.fileFormats ?? {})
    }
  };
};

const normalizeRoleAbilities = (
  abilities?: Partial<TRoleAbilities> | null
): TRoleAbilities => ({
  ...createDefaultRoleAbilities(),
  ...(abilities ?? {})
});

const getRoleLimits = (role?: Pick<TJoinedRole, 'limits'> | null): TRoleLimits =>
  normalizeRoleLimits(role?.limits);

const getRoleAbilities = (
  role?: Pick<TJoinedRole, 'abilities'> | null
): TRoleAbilities => normalizeRoleAbilities(role?.abilities);

const getAllowedRoleFileExtensions = (limits: TRoleLimits): Set<string> | null => {
  if (!limits.fileFormats.enabled) return null;

  const items = limits.fileFormats.value
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean);

  return items.length > 0 ? new Set(items) : null;
};

export {
  getAllowedRoleFileExtensions,
  getRoleAbilities,
  getRoleLimits,
  normalizeRoleAbilities,
  normalizeRoleLimits
};
