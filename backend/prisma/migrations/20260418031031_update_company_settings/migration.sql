-- AlterTable
ALTER TABLE `company_settings` ADD COLUMN `show_box_type` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `show_bunches_per_box` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `show_stems_per_bunch` BOOLEAN NOT NULL DEFAULT false;
