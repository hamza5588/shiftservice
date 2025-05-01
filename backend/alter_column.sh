#!/bin/bash
docker exec planner_mysql mysql -u planner_user -pplanner_password planner_db -e "ALTER TABLE medewerkers MODIFY COLUMN huisnummer_toevoeging VARCHAR(200);" 