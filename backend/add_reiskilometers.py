from database import engine
from sqlalchemy import text

def add_reiskilometers_column():
    try:
        # SQL to add reiskilometers column
        sql = """
        ALTER TABLE shifts
        ADD COLUMN reiskilometers FLOAT NULL;
        """
        
        with engine.begin() as conn:
            conn.execute(text(sql))
            print("Successfully added reiskilometers column to shifts table")
            
            # Verify the column was added
            result = conn.execute(text("DESCRIBE shifts reiskilometers"))
            if result.fetchone():
                print("✓ Verified: reiskilometers column exists")
            else:
                print("✗ Error: Column was not added")
                
    except Exception as e:
        print(f"Error adding reiskilometers column: {str(e)}")
        raise

if __name__ == "__main__":
    add_reiskilometers_column() 