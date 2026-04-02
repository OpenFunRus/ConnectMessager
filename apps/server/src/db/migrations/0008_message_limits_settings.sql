ALTER TABLE `settings` ADD `message_max_text_length` integer NOT NULL DEFAULT 1024;--> statement-breakpoint
ALTER TABLE `settings` ADD `message_max_lines` integer NOT NULL DEFAULT 32;
