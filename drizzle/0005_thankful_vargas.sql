CREATE TABLE `formats` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`defaults` text DEFAULT '{}' NOT NULL,
	`rules` text DEFAULT '' NOT NULL,
	`cast` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `formats_owner` ON `formats` (`owner`);--> statement-breakpoint
ALTER TABLE `boards` ADD `project` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `format_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `kind` text DEFAULT 'episode' NOT NULL;