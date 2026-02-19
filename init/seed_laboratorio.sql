-- Ejecutar archivo
-- sudo docker compose exec -T db mariadb -u root -p1234 laboratorio < init/seed_laboratorio.sql

USE laboratorio;

-- =========================
-- USERS
-- =========================

INSERT INTO users (name, email, phone) VALUES
('Juan Perez', 'juan.perez@mail.com', '3794123456'),
('María Gomez', 'maria.gomez@mail.com', '3794556677'),
('Carlos Lopez', 'carlos.lopez@mail.com', '3794988776'),
('Lucia Fernandez', 'lucia.fernandez@mail.com', '3794111222');

-- =========================
-- PROFESSIONALS
-- =========================

INSERT INTO professional (name, email, phone, speciality) VALUES
('Dr. Martin Ruiz', 'martin.ruiz@lab.com', '3794000001', 'Cardiologia'),
('Lic. Sofia Torres', 'sofia.torres@lab.com', '3794000002', 'Odontologia'),
('Dr. Andres Molina', 'andres.molina@lab.com', '3794000003', 'Medicina General');