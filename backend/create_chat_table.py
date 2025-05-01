from database import engine
from sqlalchemy import text
import traceback

def create_chat_table():
    try:
        # SQL to create the chat_messages table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            shift_id INT,
            INDEX ix_chat_messages_id (id),
            INDEX ix_chat_messages_sender_id (sender_id),
            INDEX ix_chat_messages_receiver_id (receiver_id),
            INDEX ix_chat_messages_shift_id (shift_id),
            CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) REFERENCES users(id),
            CONSTRAINT fk_chat_receiver FOREIGN KEY (receiver_id) REFERENCES users(id),
            CONSTRAINT fk_chat_shift FOREIGN KEY (shift_id) REFERENCES shifts(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        with engine.begin() as conn:
            # Drop the table if it exists to recreate it with correct types
            conn.execute(text("DROP TABLE IF EXISTS chat_messages"))
            conn.execute(text(create_table_sql))
            print("Chat messages table created successfully!")
            
            # Verify the table was created
            result = conn.execute(text("SHOW TABLES LIKE 'chat_messages'"))
            if result.fetchone():
                print("✓ Verified: chat_messages table exists")
                
                # Show table structure
                result = conn.execute(text("DESCRIBE chat_messages"))
                print("\nTable structure:")
                for row in result:
                    print(f"Column: {row[0]}, Type: {row[1]}, Null: {row[2]}, Key: {row[3]}")
            else:
                print("✗ Error: Table was not created")
                
    except Exception as e:
        print(f"Error creating table: {str(e)}")
        print("\nTraceback:")
        traceback.print_exc()

if __name__ == "__main__":
    create_chat_table() 