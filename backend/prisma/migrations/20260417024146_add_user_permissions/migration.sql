-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_super_admin` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `user_permissions` (
    `permission_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `module` ENUM('PRODUCTS', 'INVENTORY', 'FARM', 'SALES', 'CLIENTS', 'SETTINGS', 'REPORTS') NOT NULL,
    `can_view` BOOLEAN NOT NULL DEFAULT false,
    `can_create` BOOLEAN NOT NULL DEFAULT false,
    `can_edit` BOOLEAN NOT NULL DEFAULT false,
    `can_delete` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_permissions_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_permissions_user_id_module_key`(`user_id`, `module`),
    PRIMARY KEY (`permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
