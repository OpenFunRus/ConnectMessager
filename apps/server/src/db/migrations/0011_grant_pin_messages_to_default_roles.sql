INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`)
SELECT `id`, 'PIN_MESSAGES', unixepoch()
FROM `roles`
WHERE `is_default` = true;
