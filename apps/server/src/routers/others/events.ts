import { ServerEvents } from '@connectmessager/shared';
import { protectedProcedure } from '../../utils/trpc';

const onServerSettingsUpdateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.SERVER_SETTINGS_UPDATE);
  }
);

export { onServerSettingsUpdateRoute };


