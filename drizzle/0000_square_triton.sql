CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`mime` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_owner` ON `assets` (`owner`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner` ON `projects` (`owner`);--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`project` text NOT NULL,
	`title` text NOT NULL,
	`draft` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scenes_owner_project` ON `scenes` (`owner`,`project`);--> statement-breakpoint
CREATE TABLE `takes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`scene` text NOT NULL,
	`input` text NOT NULL,
	`status` text NOT NULL,
	`request` text,
	`status_url` text,
	`response_url` text,
	`video` text,
	`expanded` text,
	`error` text,
	`favorite` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `takes_owner_scene` ON `takes` (`owner`,`scene`);