import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { UserPopover } from '../user-popover';

type TMentionChipProps = {
  userId: number;
  label?: string;
  interactive?: boolean;
};

const MentionChip = memo(
  ({ userId, label: labelProp, interactive = true }: TMentionChipProps) => {
  const { t } = useTranslation('common');
  const user = useUserById(userId);
  const ownUserId = useOwnUserId();
  const isOwnMention = ownUserId === userId;
  const label =
    user ? getRenderedUsername(user) : (labelProp ?? t('deletedBadge'));

    const chip = (
      <span
        className={cn(
          'mention inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.95em] font-medium transition-colors',
          interactive ? 'cursor-pointer' : 'cursor-default',
          isOwnMention
            ? interactive
              ? 'border-[#8a6a18]/55 bg-[#5f4708]/30 text-[#ffd66b] hover:bg-[#71550d]/38'
              : 'border-[#8a6a18]/55 bg-[#5f4708]/30 text-[#ffd66b]'
            : interactive
              ? 'border-[#31557f]/45 bg-[#1f3350]/28 text-[#8dc6ff] hover:bg-[#284160]'
              : 'border-[#31557f]/45 bg-[#1f3350]/28 text-[#8dc6ff]'
        )}
      >
        @{label}
      </span>
    );

    if (!interactive) {
      return chip;
    }

    return <UserPopover userId={userId}>{chip}</UserPopover>;
  }
);

export { MentionChip };
