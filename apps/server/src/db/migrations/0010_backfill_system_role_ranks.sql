UPDATE `roles`
SET `rank` = 100
WHERE lower(`name`) IN ('разработчик', 'developer');
--> statement-breakpoint
UPDATE `roles`
SET `rank` = 90
WHERE lower(`name`) IN ('администратор', 'administrator', 'admin');
--> statement-breakpoint
UPDATE `roles`
SET `rank` = 80
WHERE lower(`name`) IN ('сисадмин', 'sysadmin');
--> statement-breakpoint
UPDATE `roles`
SET `rank` = 70
WHERE lower(`name`) IN ('служба безопасности', 'security');
--> statement-breakpoint
UPDATE `roles`
SET `rank` = 40
WHERE lower(`name`) IN ('куратор', 'curator');
--> statement-breakpoint
UPDATE `roles`
SET `rank` = 10
WHERE lower(`name`) IN ('пользователь', 'member', 'user');
