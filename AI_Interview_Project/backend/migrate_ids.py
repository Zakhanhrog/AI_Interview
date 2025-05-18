import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.config import settings

async def fix_interview_ids():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    collection = db["interviews"]

    count = 0
    async for doc in collection.find({"_id": {"$type": "string"}}):
        try:
            new_id = ObjectId(doc["_id"])
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"_id": new_id}}
            )
            count += 1
            print(f"Updated document {doc['_id']}")
        except Exception as e:
            print(f"Error updating {doc['_id']}: {str(e)}")

    print(f"Total documents updated: {count}")


if __name__ == "__main__":
    asyncio.run(fix_interview_ids())