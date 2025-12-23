CREATE DATABASE IF NOT EXISTS `laboratorio-db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS 'usuario'@'%' IDENTIFIED BY 'tu_contraseña';
GRANT ALL PRIVILEGES ON `laboratorio-db`.* TO 'usuario'@'%';
FLUSH PRIVILEGES;