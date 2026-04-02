import { z } from 'zod';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const useSecretTokenRoute = protectedProcedure
  .input(
    z.object({
      token: z.string()
    })
  )
  .mutation(async () => {
    invariant(false, {
      code: 'FORBIDDEN',
      message:
        'Secret token onboarding is disabled. The first registered user becomes the owner automatically.'
    });
  });

export { useSecretTokenRoute };
