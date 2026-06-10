
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from v3_workbook_import import WorkbookImporter

async def main():
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017/tasck")
    db = client.tasck
    
    # Run the import
    print("Starting import...")
    result = await WorkbookImporter.import_all(db)
    
    # Print the result
    print("Import complete!")
    print(f"Brands: {result['brands_imported']}")
    print(f"Contacts: {result['contacts_imported']}")
    print(f"Creators: {result['creators_imported']}")
    print(f"Business Cases: {result['business_cases_imported']}")
    print(f"Relationship Managers: {result['rms_imported']}")
    print(f"Fees: {result['fees_imported']}")
    print(f"Contracts: {result['contracts_imported']}")
    print(f"Reports: {result['reports_imported']}")
    print(f"Insights: {result['insights_imported']}")
    
    # Close the client
    await client.close()

if __name__ == "__main__":
    asyncio.run(main())
