CREATE TABLE `board_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`board` text NOT NULL,
	`kind` text NOT NULL,
	`panel` text,
	`input` text NOT NULL,
	`status` text NOT NULL,
	`status_url` text,
	`response_url` text,
	`output` text,
	`error` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `board_jobs_owner_board` ON `board_jobs` (`owner`,`board`);--> statement-breakpoint
CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`script` text NOT NULL,
	`continuity` text DEFAULT '' NOT NULL,
	`ratio` text DEFAULT '16:9' NOT NULL,
	`panels` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `boards_owner` ON `boards` (`owner`);