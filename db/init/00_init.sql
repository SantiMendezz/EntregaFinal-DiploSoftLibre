// Version vieja de BD - No se esta usando actualmente

CREATE DATABASE IF NOT EXISTS `laboratorio` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON `laboratorio`.* TO 'root'@'%';
FLUSH PRIVILEGES;