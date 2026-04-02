CREATE TABLE `user_login_codes` (
  `user_id` integer NOT NULL,
  `code_hash` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_by_user_id` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer,
  PRIMARY KEY(`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `user_login_codes_expires_idx` ON `user_login_codes` (`expires_at`);
--> statement-breakpoint
CREATE INDEX `user_login_codes_created_by_idx` ON `user_login_codes` (`created_by_user_id`);
--> statement-breakpoint
CREATE TABLE `pending_user_activations` (
  `user_id` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  PRIMARY KEY(`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pending_user_activations_expires_idx` ON `pending_user_activations` (`expires_at`);
