/*
  Warnings:

  - The values [BILLING,SHIPPING] on the enum `client_addresses_address_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `client_addresses` MODIFY `address_type` ENUM('FISCAL', 'ENTREGA') NOT NULL;

-- AlterTable
ALTER TABLE `stock_movements` MODIFY `movement_type` ENUM('ENTRADA', 'VENTA', 'DESPERDICIO', 'RESERVA', 'CANCELACION', 'AJUSTE') NOT NULL;
