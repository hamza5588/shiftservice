import mysql.connector

# Database connection configuration
config = {
    'user': 'planner_user',
    'password': 'planner_password',
    'host': 'localhost',
    'port': 3306,
    'database': 'planner_db'
}

# SQL commands to add columns
sql_commands = [
    "ALTER TABLE opdrachtgevers ADD COLUMN IF NOT EXISTS kvk_nummer VARCHAR(20) NULL;",
    "ALTER TABLE opdrachtgevers ADD COLUMN IF NOT EXISTS postcode VARCHAR(10) NULL;",
    "ALTER TABLE opdrachtgevers ADD COLUMN IF NOT EXISTS stad VARCHAR(100) NULL;",
    "ALTER TABLE opdrachtgevers ADD COLUMN IF NOT EXISTS telefoon VARCHAR(20) NULL;"
]

try:
    # Connect to the database
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()

    # Execute each SQL command
    for command in sql_commands:
        print(f"Executing: {command}")
        cursor.execute(command)
        conn.commit()

    print("All columns added successfully!")

except mysql.connector.Error as err:
    print(f"Error: {err}")

finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close() 