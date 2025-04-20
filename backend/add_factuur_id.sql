ALTER TABLE shifts
ADD COLUMN factuur_id INT NULL,
ADD CONSTRAINT fk_shifts_factuur
FOREIGN KEY (factuur_id) REFERENCES facturen(id); 