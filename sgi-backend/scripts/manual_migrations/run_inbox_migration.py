import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Database connection parameters
DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_DRIVER = os.getenv("DB_DRIVER", "{ODBC Driver 17 for SQL Server}")

def run_migration():
    conn_str = f"DRIVER={{{DB_DRIVER}}};SERVER={DB_SERVER};DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASS};TrustServerCertificate=yes;Encrypt=yes"
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        print("Connected to database...")
        
        # Read SQL file
        with open('migrations/whatsapp_inbox.sql', 'r') as file:
            sql_script = file.read()
            
        # Split by GO command as pyodbc doesn't support it directly
        batches = sql_script.split('GO')
        
        for batch in batches:
            if batch.strip():
                print(f"Executing batch: {batch[:50]}...")
                cursor.execute(batch)
                conn.commit()
                
        print("Migration executed successfully.")
        
    except Exception as e:
        print(f"Error executing migration: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_migration()
