CREATE TABLE `live_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`scene` text NOT NULL,
	`config` text NOT NULL,
	`history` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `live_sessions_owner_scene` ON `live_sessions` (`owner`,`scene`);