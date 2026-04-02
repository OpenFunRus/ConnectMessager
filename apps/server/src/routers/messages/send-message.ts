import {
  ActivityLogType,
  ChannelPermission,
  MESSAGE_DEFAULT_LINES_LIMIT,
  MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
  getMessageContentLimitError,
  getPlainTextFromHtml,
  isEmptyMessage,
  Permission,
  toDomCommand
} from '@connectmessager/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishMessage, publishReplyCount } from '../../db/publishers';
import { assertDmChannel, isDirectMessageChannel } from '../../db/queries/dms';
import { getPrimaryUserRole } from '../../db/queries/roles';
import { getSettings } from '../../db/queries/server';
import { getAllowedRoleFileExtensions, getRoleLimits } from '../../helpers/role-policy';
import { messageFiles, messages } from '../../db/schema';
import { getInvokerCtxFromTrpcCtx } from '../../helpers/get-invoker-ctx-from-trpc-ctx';
import { parseCommandArgs } from '../../helpers/parse-command-args';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { pluginManager } from '../../plugins';
import { eventBus } from '../../plugins/event-bus';
import { enqueueActivityLog } from '../../queues/activity-log';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { fileManager } from '../../utils/file-manager';
import { invariant } from '../../utils/invariant';
import { consumeRolePolicyLimit } from '../../utils/rate-limiters/role-policy';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const sendMessageRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.sendAndEditMessage.maxRequests,
  windowMs: config.rateLimiters.sendAndEditMessage.windowMs,
  logLabel: 'sendMessage',
  bypassForOwner: true
})
  .input(
    z.object({
      content: z.string(),
      channelId: z.number(),
      files: z.array(z.string()).default([]),
      parentMessageId: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await Promise.all([
      ctx.needsPermission(Permission.SEND_MESSAGES),
      ctx.needsChannelPermission(
        input.channelId,
        ChannelPermission.SEND_MESSAGES
      )
    ]);

    if (input.parentMessageId) {
      const parentMessage = await db
        .select({
          id: messages.id,
          channelId: messages.channelId,
          parentMessageId: messages.parentMessageId
        })
        .from(messages)
        .where(eq(messages.id, input.parentMessageId))
        .limit(1)
        .get();

      invariant(parentMessage, {
        code: 'NOT_FOUND',
        message: 'Parent message not found.'
      });

      invariant(parentMessage.channelId === input.channelId, {
        code: 'BAD_REQUEST',
        message: 'Parent message must be in the same channel.'
      });

      invariant(!parentMessage.parentMessageId, {
        code: 'BAD_REQUEST',
        message:
          'Cannot reply to a thread reply. Threads are only one level deep.'
      });
    }

    const [settings, isDmChannel] = await Promise.all([
      getSettings(),
      isDirectMessageChannel(input.channelId),
      assertDmChannel(input.channelId, ctx.userId)
    ]);

    const primaryRole = await getPrimaryUserRole(ctx.userId);
    const roleLimits = getRoleLimits(primaryRole);

    if (roleLimits.messagesPerMinute.enabled) {
      const rateLimit = consumeRolePolicyLimit(
        'messages',
        ctx.userId,
        roleLimits.messagesPerMinute.value
      );

      invariant(rateLimit.allowed, {
        code: 'TOO_MANY_REQUESTS',
        message: 'Message rate limit exceeded for your role.'
      });
    }

    const { storageMaxFilesPerMessage, enablePlugins } = settings;
    const roleFilesPerMessageLimit = roleLimits.filesPerMessage.enabled
      ? roleLimits.filesPerMessage.value
      : null;
    const maxFilesPerMessage =
      roleFilesPerMessageLimit !== null
        ? Math.min(storageMaxFilesPerMessage, roleFilesPerMessageLimit)
        : storageMaxFilesPerMessage;

    const limitedFiles = input.files.slice(0, Math.max(0, maxFilesPerMessage));
    invariant(limitedFiles.length === input.files.length, {
      code: 'BAD_REQUEST',
      message: `Message cannot include more than ${maxFilesPerMessage} files.`
    });

    if (limitedFiles.length > 0) {
      invariant(settings.storageUploadEnabled, {
        code: 'FORBIDDEN',
        message: 'File uploads are disabled on this server'
      });

      if (isDmChannel) {
        invariant(settings.storageFileSharingInDirectMessages, {
          code: 'FORBIDDEN',
          message: 'File sharing in direct messages is disabled on this server'
        });
      }

      const allowedExtensions = getAllowedRoleFileExtensions(roleLimits);
      const roleFileSizeBytesLimit = roleLimits.fileSizeMb.enabled
        ? roleLimits.fileSizeMb.value * 1024 * 1024
        : null;

      for (const tempFileId of limitedFiles) {
        const tempFile = fileManager.getTemporaryFile(tempFileId);

        invariant(tempFile && tempFile.userId === ctx.userId, {
          code: 'BAD_REQUEST',
          message: 'File not found'
        });

        const extension = tempFile.extension.replace(/^\./, '').toLowerCase();
        invariant(
          !allowedExtensions || allowedExtensions.has(extension),
          {
            code: 'FORBIDDEN',
            message: `File format .${extension} is not allowed for your role.`
          }
        );
        invariant(
          !roleFileSizeBytesLimit || tempFile.size <= roleFileSizeBytesLimit,
          {
            code: 'FORBIDDEN',
            message: `File ${tempFile.originalName} exceeds your role size limit.`
          }
        );
      }
    }

    invariant(!isEmptyMessage(input.content) || limitedFiles.length != 0, {
      code: 'BAD_REQUEST',
      message: 'Message cannot be empty.'
    });

    let targetContent = sanitizeMessageHtml(input.content);

    invariant(!isEmptyMessage(targetContent) || limitedFiles.length != 0, {
      code: 'BAD_REQUEST',
      message:
        'Your message only contained unsupported or removed content, so there was nothing to send.'
    });

    const textLengthLimit =
      roleLimits.charsPerMessage.enabled
        ? Math.min(
            settings.messageMaxTextLength ?? MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
            roleLimits.charsPerMessage.value
          )
        : (settings.messageMaxTextLength ?? MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT);
    const linesLimit = roleLimits.linesPerMessage.enabled
      ? Math.min(
          settings.messageMaxLines ?? MESSAGE_DEFAULT_LINES_LIMIT,
          roleLimits.linesPerMessage.value
        )
      : (settings.messageMaxLines ?? MESSAGE_DEFAULT_LINES_LIMIT);
    const contentLimitError = getMessageContentLimitError(targetContent, {
      textLengthLimit,
      linesLimit
    });
    invariant(contentLimitError !== 'MAX_LENGTH', {
      code: 'BAD_REQUEST',
      message: `Message cannot exceed ${textLengthLimit} characters.`
    });
    invariant(contentLimitError !== 'MAX_LINES', {
      code: 'BAD_REQUEST',
      message: `Message cannot exceed ${linesLimit} lines.`
    });

    let editable = true;
    let commandExecutor: ((messageId: number) => void) | undefined = undefined;

    if (enablePlugins) {
      // when plugins are enabled, need to check if the message is a command
      // this might be improved in the future with a more robust parser
      const plainText = getPlainTextFromHtml(input.content);
      const { args, commandName } = parseCommandArgs(plainText);
      const foundCommand = pluginManager.getCommandByName(commandName);

      if (foundCommand) {
        if (await ctx.hasPermission(Permission.EXECUTE_PLUGIN_COMMANDS)) {
          const argsObject: Record<string, unknown> = {};

          if (foundCommand.args) {
            foundCommand.args.forEach((argDef, index) => {
              if (index < args.length) {
                const value = args[index];

                if (argDef.type === 'number') {
                  argsObject[argDef.name] = Number(value);
                } else if (argDef.type === 'boolean') {
                  argsObject[argDef.name] = value === 'true';
                } else {
                  argsObject[argDef.name] = value;
                }
              }
            });
          }

          const plugin = await pluginManager.getPluginInfo(
            foundCommand?.pluginId || ''
          );

          editable = false;
          targetContent = toDomCommand(
            { ...foundCommand, imageUrl: plugin?.logo, status: 'pending' },
            args
          );

          // do not await, let it run in background
          commandExecutor = (messageId: number) => {
            const updateCommandStatus = (
              status: 'completed' | 'failed',
              response?: unknown
            ) => {
              const updatedContent = toDomCommand(
                {
                  ...foundCommand,
                  imageUrl: plugin?.logo,
                  response,
                  status
                },
                args
              );

              db.update(messages)
                .set({ content: updatedContent })
                .where(eq(messages.id, messageId))
                .execute();

              publishMessage(messageId, input.channelId, 'update');
            };

            pluginManager
              .executeCommand(
                foundCommand.pluginId,
                foundCommand.name,
                getInvokerCtxFromTrpcCtx(ctx),
                argsObject
              )
              .then((response) => {
                updateCommandStatus('completed', response);
              })
              .catch((error) => {
                updateCommandStatus(
                  'failed',
                  error?.message || 'Unknown error'
                );
              })
              .finally(() => {
                enqueueActivityLog({
                  type: ActivityLogType.EXECUTED_PLUGIN_COMMAND,
                  userId: ctx.user.id,
                  details: {
                    pluginId: foundCommand.pluginId,
                    commandName: foundCommand.name,
                    args: argsObject
                  }
                });
              });
          };
        }
      }
    }

    const message = await db
      .insert(messages)
      .values({
        channelId: input.channelId,
        userId: ctx.userId,
        content: targetContent,
        editable,
        parentMessageId: input.parentMessageId ?? null,
        createdAt: Date.now()
      })
      .returning()
      .get();

    commandExecutor?.(message.id);

    if (limitedFiles.length > 0) {
      for (const tempFileId of limitedFiles) {
        const newFile = await fileManager.saveFile(tempFileId, ctx.userId, {
          chatId: input.channelId
        });

        await db.insert(messageFiles).values({
          messageId: message.id,
          fileId: newFile.id,
          createdAt: Date.now()
        });
      }
    }

    publishMessage(message.id, input.channelId, 'create');

    if (input.parentMessageId) {
      publishReplyCount(input.parentMessageId, input.channelId);
    }

    enqueueProcessMetadata(targetContent, message.id);

    eventBus.emit('message:created', {
      messageId: message.id,
      channelId: input.channelId,
      userId: ctx.userId,
      content: targetContent
    });

    return message.id;
  });

export { sendMessageRoute };


