import mysql.connector

# Database configuration
config = {
    'user': 'planner_user',
    'password': 'planner_password',
    'host': 'localhost',
    'port': 3306,
    'database': 'planner_db'
}

try:
    # Connect to the database
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()

    # Check if column exists
    cursor.execute("""
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_name = 'shifts'
        AND column_name = 'factuur_id'
    """)
    
    if cursor.fetchone()[0] == 0:
        print("Adding factuur_id column to shifts table...")
        cursor.execute("""
            ALTER TABLE shifts
            ADD COLUMN factuur_id INT NULL,
            ADD CONSTRAINT fk_shifts_factuur
            FOREIGN KEY (factuur_id) REFERENCES facturen(id)
        """)
        conn.commit()
        print("Added factuur_id column successfully")
    else:
        print("factuur_id column already exists")

except mysql.connector.Error as err:
    print(f"Error: {err}")

finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close() 