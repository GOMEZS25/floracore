-- AlterTable
ALTER TABLE `products` ADD COLUMN `default_waste_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `weeks_to_cut` INTEGER NOT NULL DEFAULT 0;
