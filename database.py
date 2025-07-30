import motor.motor_asyncio
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import logging

load_dotenv()

# Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_NAME = os.getenv("MONGODB_DATABASE", "metadata")

# Setup logging
logger = logging.getLogger(__name__)

# Async client for FastAPI
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
database = client[MONGODB_NAME]

# Collections
scripts_collection = database.scripts
metadata_collection = database.metadata

# Health check function
async def ping_database():
    """Check if MongoDB Atlas connection is working"""
    try:
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB Atlas: {e}")
        return False

# Close connection function
async def close_database_connection():
    """Close the database connection"""
    client.close()
    logger.info("Database connection closed")