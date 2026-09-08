CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`description` text NOT NULL,
	`style` text NOT NULL,
	`layout` text NOT NULL,
	`status` text NOT NULL,
	`input` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`selected` text,
	`status_url` text,
	`response_url` text,
	`error` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `characters_owner` ON `characters` (`owner`);