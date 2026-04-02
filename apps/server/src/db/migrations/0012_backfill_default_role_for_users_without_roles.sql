INSERT OR IGNORE INTO `user_roles` (`user_id`, `role_id`, `created_at`)
SELECT `u`.`id`, `r`.`id`, unixepoch()
FROM `users` AS `u`
JOIN `roles` AS `r` ON `r`.`is_default` = true
LEFT JOIN `user_roles` AS `ur` ON `ur`.`user_id` = `u`.`id`
WHERE `ur`.`user_id` IS NULL;
