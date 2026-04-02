import { openDialog } from '@/features/dialogs/actions';
import {
  useCategories,
  useCategoryById
} from '@/features/server/categories/hooks';
import {
  useCan,
  useHasVisibleChannelsInCategory
} from '@/features/server/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Permission, getTrpcError } from '@connectmessager/shared';
import { IconButton } from '@connectmessager/ui';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CategoryContextMenu } from '../context-menus/category';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { Channels } from './channels';
import { useCategoryExpanded } from './hooks';

type TCategoryProps = {
  categoryId: number;
};

const getDisplayCategoryName = (
  categoryName: string,
  t: (key: string) => string
) => {
  if (categoryName === 'Text Channels') {
    return t('defaultTextChannels');
  }

  if (categoryName === 'Voice Channels') {
    return t('defaultVoiceChannels');
  }

  return categoryName;
};

const Category = memo(({ categoryId }: TCategoryProps) => {
  const { t } = useTranslation('sidebar');
  const can = useCan();
  const hasVisibleChannelsInCategory =
    useHasVisibleChannelsInCategory(categoryId);
  const { expanded, toggleExpanded } = useCategoryExpanded(categoryId);
  const category = useCategoryById(categoryId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: categoryId });

  const onCreateChannelClick = useCallback(() => {
    openDialog(Dialog.CREATE_CHANNEL, { categoryId });
  }, [categoryId]);

  if (
    !category ||
    (!hasVisibleChannelsInCategory &&
      !can([Permission.MANAGE_CHANNELS, Permission.MANAGE_CATEGORIES]))
  ) {
    return null;
  }

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform && { ...transform, x: 0 }),
        transition,
        opacity: isDragging ? 0.5 : 1
      }}
      className="mb-3"
    >
      <div className="mb-1 flex w-full items-center px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8fa2bb]">
        <div className="flex w-full items-stretch gap-1">
          <IconButton
            variant="ghost"
            size="sm"
            icon={ChevronIcon}
            onClick={toggleExpanded}
            title={expanded ? t('collapseCategory') : t('expandCategory')}
            className="h-6 w-6 rounded-md text-[#8fa2bb] hover:bg-[#1b2940] hover:text-white"
          />
          <CategoryContextMenu categoryId={category.id}>
            <span
              {...attributes}
              {...listeners}
              className="flex-1 cursor-grab truncate rounded-md px-1 py-1 text-[#9fb2c8] transition-colors active:cursor-grabbing hover:text-white"
            >
              {getDisplayCategoryName(category.name, t)}
            </span>
          </CategoryContextMenu>
        </div>

        <Protect permission={Permission.MANAGE_CHANNELS}>
          <IconButton
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={onCreateChannelClick}
            title={t('createChannel')}
            className="h-6 w-6 rounded-md text-[#8fa2bb] hover:bg-[#1b2940] hover:text-white"
          />
        </Protect>
      </div>

      {expanded && <Channels categoryId={category.id} />}
    </div>
  );
});

const Categories = memo(() => {
  const { t } = useTranslation('sidebar');
  const can = useCan();
  const categories = useCategories();
  const categoryIds = useMemo(
    () => categories.map((cat) => cat.id),
    [categories]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = categoryIds.indexOf(active.id as number);
      const newIndex = categoryIds.indexOf(over.id as number);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reorderedIds = [...categoryIds];
      const [movedId] = reorderedIds.splice(oldIndex, 1);

      reorderedIds.splice(newIndex, 0, movedId);

      const trpc = getTRPCClient();

      try {
        await trpc.categories.reorder.mutate({ categoryIds: reorderedIds });
      } catch (error) {
        toast.error(getTrpcError(error, t('failedReorderCategories')));
      }
    },
    [categoryIds, t]
  );

  return (
    <div className="flex-1 overflow-y-auto px-2 py-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categoryIds}
          strategy={verticalListSortingStrategy}
          disabled={!can(Permission.MANAGE_CATEGORIES)}
        >
          {categories.map((category) => (
            <Category key={category.id} categoryId={category.id} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
});

export { Categories };


