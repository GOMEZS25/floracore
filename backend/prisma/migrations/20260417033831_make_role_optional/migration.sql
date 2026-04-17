-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_role_id_fkey`;

-- AlterTable
ALTER TABLE `users` MODIFY `role_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE SET NULL ON UPDATE CASCADE;
