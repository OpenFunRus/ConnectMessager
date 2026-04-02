ALTER TABLE `channels` ADD `is_group_channel` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `channels` ADD `group_description` text;--> statement-breakpoint
ALTER TABLE `channels` ADD `group_filter` text NOT NULL DEFAULT 'Все';--> statement-breakpoint
ALTER TABLE `channels` ADD `group_avatar_id` integer REFERENCES `files`(`id`) ON DELETE set null;
