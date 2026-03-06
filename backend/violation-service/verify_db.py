import logging
from sqlalchemy import text
from app.db.base import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("Database connection successful!")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False

if __name__ == "__main__":
    verify_connection()
