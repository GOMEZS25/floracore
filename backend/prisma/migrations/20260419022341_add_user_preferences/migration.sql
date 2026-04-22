-- CreateTable
CREATE TABLE `user_preferences` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `preference_key` VARCHAR(60) NOT NULL,
    `preference_value` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_preferences_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_preferences_user_id_preference_key_key`(`user_id`, `preference_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
