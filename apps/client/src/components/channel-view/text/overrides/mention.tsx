import { MentionChip } from '@/components/mention-chip';
import { memo } from 'react';

type TMentionOverrideProps = {
  userId: number;
  label?: string;
};

const MentionOverride = memo(({ userId, label }: TMentionOverrideProps) => (
  <MentionChip userId={userId} label={label} interactive={false} />
));

export { MentionOverride };
