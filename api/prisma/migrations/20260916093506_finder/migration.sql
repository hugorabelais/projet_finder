-- CreateTable
CREATE TABLE `Utilisateur` (
    `utilisateur_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mot_de_passe` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `date_inscription` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hotel_id` INTEGER NULL,

    UNIQUE INDEX `Utilisateur_email_key`(`email`),
    PRIMARY KEY (`utilisateur_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Hotel` (
    `hotel_id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `etoiles` INTEGER NOT NULL,
    `adresse` VARCHAR(191) NOT NULL,
    `code_postal` VARCHAR(191) NOT NULL,
    `ville` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `gerant` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Hotel_email_key`(`email`),
    PRIMARY KEY (`hotel_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chambre` (
    `chambre_id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_id` INTEGER NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `categorie` VARCHAR(191) NOT NULL,
    `capacite` INTEGER NOT NULL,
    `prix_nuit` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `disponible` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Chambre_hotel_id_numero_key`(`hotel_id`, `numero`),
    PRIMARY KEY (`chambre_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservation` (
    `reservation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `voyageur_id` INTEGER NOT NULL,
    `chambre_id` INTEGER NOT NULL,
    `date_arrivee` DATE NOT NULL,
    `date_depart` DATE NOT NULL,
    `nb_personnes` INTEGER NOT NULL,
    `statut` VARCHAR(191) NOT NULL,
    `demande_speciale` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`reservation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Utilisateur` ADD CONSTRAINT `Utilisateur_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `Hotel`(`hotel_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chambre` ADD CONSTRAINT `Chambre_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `Hotel`(`hotel_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_voyageur_id_fkey` FOREIGN KEY (`voyageur_id`) REFERENCES `Utilisateur`(`utilisateur_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_chambre_id_fkey` FOREIGN KEY (`chambre_id`) REFERENCES `Chambre`(`chambre_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
