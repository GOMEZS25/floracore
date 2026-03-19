/*
  Warnings:

  - The values [IN,OUT,ADJUST] on the enum `stock_movements_movement_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- DropForeignKey
ALTER TABLE `packaging` DROP FOREIGN KEY `packaging_created_by_fkey`;

-- DropIndex
DROP INDEX `packaging_category_idx` ON `packaging`;

-- AlterTable
ALTER TABLE `lotes` ADD COLUMN `cantidad_cajas` INTEGER NULL,
    ADD COLUMN `ramos_por_caja` INTEGER NULL,
    ADD COLUMN `tallos_por_ramo` INTEGER NULL,
    ADD COLUMN `tipo_caja` ENUM('QUARTER_BOX', 'HALF_BOX', 'FULL_BOX') NULL,
    MODIFY `estado` ENUM('DISPONIBLE', 'AGOTADO', 'RESERVADO') NOT NULL DEFAULT 'DISPONIBLE';

-- AlterTable
ALTER TABLE `stock_movements` MODIFY `movement_type` ENUM('ENTRADA', 'VENTA', 'DESPERDICIO', 'RESERVA') NOT NULL;

-- AddForeignKey
ALTER TABLE `Packaging` ADD CONSTRAINT `Packaging_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `packaging` RENAME INDEX `packaging_is_active_idx` TO `Packaging_is_active_idx`;

-- RenameIndex
ALTER TABLE `packaging` RENAME INDEX `packaging_reference_key` TO `Packaging_reference_key`;
