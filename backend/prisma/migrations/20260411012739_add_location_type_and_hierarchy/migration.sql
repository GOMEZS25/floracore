/*
  Warnings:

  - Added the required column `type` to the `inventory_locations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `inventory_locations` ADD COLUMN `parent_id` INTEGER NULL,
    ADD COLUMN `type` ENUM('FINCA', 'BLOQUE', 'CAMA') NOT NULL;

-- CreateIndex
CREATE INDEX `inventory_locations_parent_id_idx` ON `inventory_locations`(`parent_id`);

-- CreateIndex
CREATE INDEX `inventory_locations_type_idx` ON `inventory_locations`(`type`);

-- CreateIndex
CREATE INDEX `inventory_locations_is_active_idx` ON `inventory_locations`(`is_active`);

-- AddForeignKey
ALTER TABLE `inventory_locations` ADD CONSTRAINT `inventory_locations_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `inventory_locations`(`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
