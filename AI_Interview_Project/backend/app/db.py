# backend/app/db.py

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure

from .config import settings

class MongoDBConnectionManager:
    client: AsyncIOMotorClient = None
    database: AsyncIOMotorDatabase = None

db_manager = MongoDBConnectionManager()

async def connect_to_mongo():
    if db_manager.client and db_manager.database:
        print("MongoDB connection already established.")
        return

    separator = '&' if '?' in settings.MONGODB_URL else '?'
    connection_uri = f"{settings.MONGODB_URL}{separator}uuidRepresentation=standard&tz_aware=true"

    print(f"Attempting to connect to MongoDB with URI: {connection_uri}")
    try:
        db_manager.client = AsyncIOMotorClient(
            connection_uri, # Sử dụng URI đã bổ sung tùy chọn
            serverSelectionTimeoutMS=5000
        )

        await db_manager.client.admin.command('ping')
        db_manager.database = db_manager.client[settings.DATABASE_NAME]

        print(f"Successfully connected to MongoDB database: '{settings.DATABASE_NAME}' "
              f"with options from URI (uuidRepresentation=standard, tz_aware=true).")

    except ConnectionFailure as ce:
        print(f"MongoDB Connection Failure: Could not connect to server. URI: '{connection_uri}'. Error: {ce}")
        db_manager.client = None
        db_manager.database = None
    except Exception as e:
        print(f"An unexpected error occurred during MongoDB connection: {e}")
        db_manager.client = None
        db_manager.database = None

async def close_mongo_connection():
    if db_manager.client:
        print("Closing MongoDB connection...")
        db_manager.client.close()
        db_manager.client = None
        db_manager.database = None
        print("MongoDB connection closed.")
    else:
        print("No active MongoDB connection to close.")

def get_database() -> AsyncIOMotorDatabase:
    if db_manager.database is None:
        print("ERROR: MongoDB database is not initialized. Connection might have failed at startup.")
        raise RuntimeError("Database not available. Check server logs for connection errors.")
    return db_manager.database