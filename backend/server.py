from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
from io import BytesIO
import openpyxl

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class MachineType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    monthly_fee: float
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MachineTypeCreate(BaseModel):
    name: str
    monthly_fee: float

class CustomerMachine(BaseModel):
    machine_type_id: str
    machine_name: str
    quantity: int

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str = ""
    machines: List[CustomerMachine] = []
    total_cost: float = 0  # Your cost
    total_fee: float = 0   # What customer pays
    status: str = "active"  # active, paused
    prepaid_months: int = 0  # Months paid in advance
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomerCreate(BaseModel):
    name: str
    phone: str = ""
    machines: List[Dict] = []
    total_cost: float = 0
    status: str = "active"
    prepaid_months: int = 0
    notes: str = ""

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    machines: Optional[List[Dict]] = None
    total_cost: Optional[float] = None
    status: Optional[str] = None
    prepaid_months: Optional[int] = None
    notes: Optional[str] = None

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    month: str  # Format: "2024-01"
    amount: float
    status: str = "unpaid"  # paid, unpaid, paused
    paid_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PaymentUpdate(BaseModel):
    status: str
    amount: Optional[float] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    message_template: str = ""
    whish_number: str = "03022005"
    usdt_address: str = "0x4e44e18349c4531f4463Fc49056b182C28C54877"
    team_name: str = "WKBeast Team"

class SettingsUpdate(BaseModel):
    message_template: Optional[str] = None
    whish_number: Optional[str] = None
    usdt_address: Optional[str] = None
    team_name: Optional[str] = None

# ==================== MACHINE TYPES ====================

@api_router.get("/machine-types", response_model=List[MachineType])
async def get_machine_types():
    types = await db.machine_types.find({}, {"_id": 0}).to_list(100)
    return types

@api_router.post("/machine-types", response_model=MachineType)
async def create_machine_type(data: MachineTypeCreate):
    machine_type = MachineType(**data.model_dump())
    doc = machine_type.model_dump()
    await db.machine_types.insert_one(doc)
    return machine_type

@api_router.put("/machine-types/{type_id}", response_model=MachineType)
async def update_machine_type(type_id: str, data: MachineTypeCreate):
    result = await db.machine_types.find_one_and_update(
        {"id": type_id},
        {"$set": {"name": data.name, "monthly_fee": data.monthly_fee}},
        return_document=True,
        projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Machine type not found")
    return result

@api_router.delete("/machine-types/{type_id}")
async def delete_machine_type(type_id: str):
    result = await db.machine_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Machine type not found")
    return {"message": "Deleted"}

# ==================== CUSTOMERS ====================

@api_router.get("/customers", response_model=List[Customer])
async def get_customers():
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.post("/customers", response_model=Customer)
async def create_customer(data: CustomerCreate):
    # Calculate total fee from machines
    machine_types = await db.machine_types.find({}, {"_id": 0}).to_list(100)
    machine_fee_map = {mt["id"]: mt["monthly_fee"] for mt in machine_types}
    machine_name_map = {mt["id"]: mt["name"] for mt in machine_types}
    
    total_fee = 0
    machines_with_names = []
    for m in data.machines:
        fee = machine_fee_map.get(m.get("machine_type_id"), 0)
        name = machine_name_map.get(m.get("machine_type_id"), "Unknown")
        qty = m.get("quantity", 1)
        total_fee += fee * qty
        machines_with_names.append({
            "machine_type_id": m.get("machine_type_id"),
            "machine_name": name,
            "quantity": qty
        })
    
    customer = Customer(
        name=data.name,
        phone=data.phone,
        machines=machines_with_names,
        total_cost=data.total_cost,
        total_fee=total_fee,
        status=data.status,
        prepaid_months=data.prepaid_months,
        notes=data.notes
    )
    doc = customer.model_dump()
    await db.customers.insert_one(doc)
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, data: CustomerUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Recalculate total fee if machines changed
    if "machines" in update_data:
        machine_types = await db.machine_types.find({}, {"_id": 0}).to_list(100)
        machine_fee_map = {mt["id"]: mt["monthly_fee"] for mt in machine_types}
        machine_name_map = {mt["id"]: mt["name"] for mt in machine_types}
        
        total_fee = 0
        machines_with_names = []
        for m in update_data["machines"]:
            fee = machine_fee_map.get(m.get("machine_type_id"), 0)
            name = machine_name_map.get(m.get("machine_type_id"), "Unknown")
            qty = m.get("quantity", 1)
            total_fee += fee * qty
            machines_with_names.append({
                "machine_type_id": m.get("machine_type_id"),
                "machine_name": name,
                "quantity": qty
            })
        update_data["machines"] = machines_with_names
        update_data["total_fee"] = total_fee
    
    result = await db.customers.find_one_and_update(
        {"id": customer_id},
        {"$set": update_data},
        return_document=True,
        projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")
    return result

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    # Also delete customer's payments
    await db.payments.delete_many({"customer_id": customer_id})
    return {"message": "Deleted"}

# ==================== PAYMENTS ====================

@api_router.get("/payments")
async def get_payments(month: Optional[str] = None):
    query = {}
    if month:
        query["month"] = month
    payments = await db.payments.find(query, {"_id": 0}).to_list(10000)
    return payments

@api_router.post("/payments/generate")
async def generate_monthly_payments(month: str):
    """Generate payment records for all active customers for a specific month"""
    customers = await db.customers.find({"status": "active"}, {"_id": 0}).to_list(1000)
    
    created = 0
    for customer in customers:
        # Check if payment already exists
        existing = await db.payments.find_one({
            "customer_id": customer["id"],
            "month": month
        })
        if not existing:
            # Check prepaid months
            prepaid = customer.get("prepaid_months", 0)
            status = "paid" if prepaid > 0 else "unpaid"
            
            payment = Payment(
                customer_id=customer["id"],
                customer_name=customer["name"],
                month=month,
                amount=customer["total_fee"],
                status=status
            )
            await db.payments.insert_one(payment.model_dump())
            
            # Decrease prepaid months if used
            if prepaid > 0:
                await db.customers.update_one(
                    {"id": customer["id"]},
                    {"$inc": {"prepaid_months": -1}}
                )
            created += 1
    
    return {"message": f"Generated {created} payment records for {month}"}

@api_router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, data: PaymentUpdate):
    update_data = {"status": data.status}
    if data.status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    if data.amount is not None:
        update_data["amount"] = data.amount
    
    result = await db.payments.find_one_and_update(
        {"id": payment_id},
        {"$set": update_data},
        return_document=True,
        projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Payment not found")
    return result

@api_router.post("/payments/bulk-status")
async def bulk_update_payment_status(payment_ids: List[str], status: str):
    update_data = {"status": status}
    if status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.payments.update_many(
        {"id": {"$in": payment_ids}},
        {"$set": update_data}
    )
    return {"modified": result.modified_count}

# ==================== STATISTICS ====================

@api_router.get("/stats")
async def get_stats():
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    
    total_customers = len(customers)
    active_customers = len([c for c in customers if c.get("status") == "active"])
    paused_customers = len([c for c in customers if c.get("status") == "paused"])
    
    total_monthly_revenue = sum(c.get("total_fee", 0) for c in customers if c.get("status") == "active")
    total_monthly_cost = sum(c.get("total_cost", 0) for c in customers if c.get("status") == "active")
    monthly_profit = total_monthly_revenue - total_monthly_cost
    
    # Payment stats by month
    monthly_stats = {}
    for p in payments:
        month = p.get("month", "Unknown")
        if month not in monthly_stats:
            monthly_stats[month] = {"paid": 0, "unpaid": 0, "paused": 0, "total": 0}
        
        status = p.get("status", "unpaid")
        amount = p.get("amount", 0)
        monthly_stats[month][status] = monthly_stats[month].get(status, 0) + amount
        monthly_stats[month]["total"] += amount
    
    # Total collected vs pending
    total_collected = sum(p.get("amount", 0) for p in payments if p.get("status") == "paid")
    total_pending = sum(p.get("amount", 0) for p in payments if p.get("status") == "unpaid")
    
    # Machine breakdown
    machine_counts = {}
    for c in customers:
        for m in c.get("machines", []):
            name = m.get("machine_name", "Unknown")
            qty = m.get("quantity", 1)
            machine_counts[name] = machine_counts.get(name, 0) + qty
    
    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "paused_customers": paused_customers,
        "total_monthly_revenue": total_monthly_revenue,
        "total_monthly_cost": total_monthly_cost,
        "monthly_profit": monthly_profit,
        "profit_margin": (monthly_profit / total_monthly_revenue * 100) if total_monthly_revenue > 0 else 0,
        "total_collected": total_collected,
        "total_pending": total_pending,
        "monthly_stats": monthly_stats,
        "machine_counts": machine_counts
    }

# ==================== SETTINGS ====================

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default = Settings(
            message_template="""📢 Dear Valued Customer,

This is a kind reminder to please settle your hosting fees before the 2nd of each month, as we have major financial obligations to cover by that date.

Unlike other farms, we don't request payments 6 months in advance — but we kindly ask for your cooperation in making the payment on time each month.

🔹 {month} Hosting Fee: ${amount}
🔹 Payment Options:
• Whish: {whish}
• USDT (BEP20 Network): {usdt}

Thank you for your continued trust and support. Your timely payment helps us keep everything running smoothly.

Warm regards,
{team} 🐺💼"""
        )
        await db.settings.insert_one(default.model_dump())
        return default
    return settings

@api_router.put("/settings", response_model=Settings)
async def update_settings(data: SettingsUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.settings.find_one_and_update(
        {"id": "settings"},
        {"$set": update_data},
        upsert=True,
        return_document=True,
        projection={"_id": 0}
    )
    return result

# ==================== WHATSAPP ====================

@api_router.post("/whatsapp/generate-links")
async def generate_whatsapp_links(month: str, include_paid: bool = False):
    """Generate WhatsApp links for unpaid customers"""
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        settings = {
            "message_template": "Payment reminder for {month}: ${amount}",
            "whish_number": "03022005",
            "usdt_address": "0x4e44e18349c4531f4463Fc49056b182C28C54877",
            "team_name": "WKBeast Team"
        }
    
    # Get payments for the month
    query = {"month": month}
    if not include_paid:
        query["status"] = "unpaid"
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
    
    # Get customer phone numbers
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    customer_map = {c["id"]: c for c in customers}
    
    links = []
    for payment in payments:
        customer = customer_map.get(payment["customer_id"])
        if not customer or not customer.get("phone"):
            continue
        
        # Skip paused customers
        if customer.get("status") == "paused":
            continue
        
        # Format message
        message = settings["message_template"].format(
            month=month,
            amount=payment["amount"],
            whish=settings["whish_number"],
            usdt=settings["usdt_address"],
            team=settings["team_name"]
        )
        
        # Clean phone number
        phone = customer["phone"].replace(" ", "").replace("-", "").replace("+", "")
        if not phone.startswith("961"):
            phone = "961" + phone.lstrip("0")
        
        # Create WhatsApp link
        import urllib.parse
        encoded_message = urllib.parse.quote(message)
        link = f"https://wa.me/{phone}?text={encoded_message}"
        
        links.append({
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "phone": customer["phone"],
            "amount": payment["amount"],
            "link": link,
            "payment_id": payment["id"]
        })
    
    return links

# ==================== EXCEL IMPORT/EXPORT ====================

@api_router.post("/import/excel")
async def import_excel(file: UploadFile = File(...)):
    """Import customers from Excel file"""
    contents = await file.read()
    wb = openpyxl.load_workbook(BytesIO(contents))
    ws = wb.active
    
    # Get machine types for mapping
    machine_types = await db.machine_types.find({}, {"_id": 0}).to_list(100)
    machine_name_map = {mt["name"].lower(): mt for mt in machine_types}
    
    imported = 0
    errors = []
    
    # Skip header row
    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        try:
            if not row[0]:  # Skip empty rows
                continue
            
            name = str(row[0]).strip()
            equipment = str(row[1]).strip() if row[1] else ""
            cost = float(row[2]) if row[2] else 0
            fee = float(row[3]) if row[3] else 0
            phone = str(row[4]).strip() if len(row) > 4 and row[4] else ""
            
            # Parse equipment string to get machines
            machines = []
            total_fee = 0
            
            # Try to parse equipment like "2Ks5pro L9" or "ks5pro l7 4l9 + 2 L1"
            # This is a basic parser - can be improved
            if equipment:
                import re
                # Find patterns like "2L9", "4l9", "ks5pro", etc.
                parts = re.findall(r'(\d*)\s*([a-zA-Z0-9]+)', equipment)
                for qty_str, machine_name in parts:
                    qty = int(qty_str) if qty_str else 1
                    machine_key = machine_name.lower()
                    
                    if machine_key in machine_name_map:
                        mt = machine_name_map[machine_key]
                        machines.append({
                            "machine_type_id": mt["id"],
                            "machine_name": mt["name"],
                            "quantity": qty
                        })
                        total_fee += mt["monthly_fee"] * qty
            
            # Use provided fee if machines couldn't be parsed
            if total_fee == 0:
                total_fee = fee
            
            customer = Customer(
                name=name,
                phone=phone,
                machines=machines,
                total_cost=cost,
                total_fee=total_fee,
                status="active"
            )
            
            await db.customers.insert_one(customer.model_dump())
            imported += 1
            
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")
    
    return {
        "imported": imported,
        "errors": errors
    }

@api_router.get("/export/excel")
async def export_excel():
    """Export customers to Excel file"""
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Customers"
    
    # Headers
    ws.append(["Name", "Phone", "Machines", "Your Cost", "Customer Fee", "Status", "Prepaid Months", "Notes"])
    
    for customer in customers:
        machines_str = ", ".join([
            f"{m.get('quantity', 1)}x {m.get('machine_name', 'Unknown')}" 
            for m in customer.get("machines", [])
        ])
        ws.append([
            customer.get("name", ""),
            customer.get("phone", ""),
            machines_str,
            customer.get("total_cost", 0),
            customer.get("total_fee", 0),
            customer.get("status", "active"),
            customer.get("prepaid_months", 0),
            customer.get("notes", "")
        ])
    
    # Save to BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=customers.xlsx"}
    )

# ==================== INIT DEFAULT MACHINE TYPES ====================

@api_router.post("/init")
async def init_default_data():
    """Initialize default machine types"""
    default_machines = [
        {"name": "L1", "monthly_fee": 100},
        {"name": "L7", "monthly_fee": 300},
        {"name": "L9", "monthly_fee": 250},
        {"name": "Ks5pro", "monthly_fee": 250},
        {"name": "Z15pro", "monthly_fee": 250},
    ]
    
    created = 0
    for machine in default_machines:
        existing = await db.machine_types.find_one({"name": machine["name"]})
        if not existing:
            mt = MachineType(**machine)
            await db.machine_types.insert_one(mt.model_dump())
            created += 1
    
    # Initialize settings
    settings = await db.settings.find_one({"id": "settings"})
    if not settings:
        await get_settings()
    
    return {"message": f"Initialized {created} machine types"}

@api_router.get("/")
async def root():
    return {"message": "WKBeast Crypto Farm Manager API"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
