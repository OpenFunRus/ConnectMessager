ALTER TABLE `roles` ADD `rank` integer NOT NULL DEFAULT 10;--> statement-breakpoint
ALTER TABLE `roles` ADD `scope` text NOT NULL DEFAULT 'global';--> statement-breakpoint
ALTER TABLE `roles` ADD `filter` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `roles` ADD `limits` text NOT NULL DEFAULT '{"messagesPerMinute":{"enabled":false,"value":15},"requestsPerMinute":{"enabled":false,"value":15},"charsPerMessage":{"enabled":false,"value":1024},"linesPerMessage":{"enabled":false,"value":32},"fileSizeMb":{"enabled":false,"value":3},"filesPerMessage":{"enabled":false,"value":9},"fileFormats":{"enabled":false,"value":"pdf, png, jpg, jpeg, xls, xlsx, doc, docx"}}';--> statement-breakpoint
ALTER TABLE `roles` ADD `abilities` text NOT NULL DEFAULT '{"call":false,"videoCall":false,"remoteDesktop":false}';
