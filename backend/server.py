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

# ==================== CUSTOMER PORTAL MODELS ====================

class CustomerAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str  # Links to Customer
    username: str  # Customer name (lowercase, no spaces)
    password: str  # Last 4 digits of phone
    worker_name: str = ""  # ViaBTC worker name
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomerAccountCreate(BaseModel):
    customer_id: str
    username: str
    password: str
    worker_name: str = ""

class MaintenanceLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    machine_info: str = ""
    description: str
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MaintenanceLogCreate(BaseModel):
    customer_id: str
    machine_info: str = ""
    description: str

class FarmStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "farm_stats"
    machines_online: int = 2430
    machines_offline: int = 10
    total_hashrate: str = "850 TH/s"
    fluctuation: int = 5  # Random +/- range

class FarmStatsUpdate(BaseModel):
    machines_online: Optional[int] = None
    machines_offline: Optional[int] = None
    total_hashrate: Optional[str] = None
    fluctuation: Optional[int] = None

class ViaBTCSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "viabtc_settings"
    access_key: str = ""
    secret_key: str = ""
    enabled: bool = False

class MachineStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    worker_name: str
    status: str = "online"  # online, offline
    hashrate: str = "0 TH/s"
    temperature: str = "0°C"
    uptime: str = "0h"
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

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
    
    # Machine breakdown (normalize variants like L9-275 → L9)
    machine_counts = {}
    for c in customers:
        for m in c.get("machines", []):
            name = m.get("machine_name", "Unknown")
            # Normalize: L9-275, L9-260 → L9
            import re
            base_name = re.sub(r'[-_]\d+$', '', name.upper())
            qty = m.get("quantity", 1)
            machine_counts[base_name] = machine_counts.get(base_name, 0) + qty
    
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

def normalize_machine_name(name):
    """Normalize machine names like L9-275, l9-260, L9 to base type L9"""
    import re
    name = name.strip().upper()
    # Remove variants like -275, -260, -250
    name = re.sub(r'[-_]\d+$', '', name)
    # Common normalizations
    name_map = {
        'KS5L': 'KS5PRO',
        'KS5': 'KS5PRO',
    }
    return name_map.get(name, name)

@api_router.post("/import/excel")
async def import_excel(file: UploadFile = File(...)):
    """Import customers from Excel file"""
    contents = await file.read()
    wb = openpyxl.load_workbook(BytesIO(contents))
    ws = wb.active
    
    # Get machine types for mapping
    machine_types = await db.machine_types.find({}, {"_id": 0}).to_list(100)
    machine_name_map = {mt["name"].upper(): mt for mt in machine_types}
    
    imported = 0
    errors = []
    
    # Get header row to find column indices
    headers = [str(cell).strip().lower() if cell else "" for cell in next(ws.iter_rows(min_row=1, max_row=1, values_only=True))]
    
    # Find column indices
    name_idx = next((i for i, h in enumerate(headers) if 'name' in h), 0)
    phone_idx = next((i for i, h in enumerate(headers) if 'phone' in h), 1)
    machines_idx = next((i for i, h in enumerate(headers) if 'machine' in h), 2)
    cost_idx = next((i for i, h in enumerate(headers) if 'cost' in h or 'your' in h), 3)
    fee_idx = next((i for i, h in enumerate(headers) if 'fee' in h or 'customer' in h), 4)
    status_idx = next((i for i, h in enumerate(headers) if 'status' in h), 5)
    prepaid_idx = next((i for i, h in enumerate(headers) if 'prepaid' in h), 6)
    
    # Skip header row
    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        try:
            if not row or not row[name_idx]:  # Skip empty rows
                continue
            
            name = str(row[name_idx]).strip()
            phone = str(row[phone_idx]).strip() if len(row) > phone_idx and row[phone_idx] else ""
            machines_str = str(row[machines_idx]).strip() if len(row) > machines_idx and row[machines_idx] else ""
            cost = float(row[cost_idx]) if len(row) > cost_idx and row[cost_idx] else 0
            fee = float(row[fee_idx]) if len(row) > fee_idx and row[fee_idx] else 0
            status = str(row[status_idx]).strip().lower() if len(row) > status_idx and row[status_idx] else "active"
            prepaid = int(row[prepaid_idx]) if len(row) > prepaid_idx and row[prepaid_idx] else 0
            
            # Parse machines string like "1x L9", "2x L9, 1x L7", "9x L9, 1x L1", "3x L9-275"
            machines = []
            total_fee = 0
            
            if machines_str:
                import re
                # Find patterns like "1x L9", "2x L9-275", "1x ks5pro"
                parts = re.findall(r'(\d+)\s*x\s*([a-zA-Z0-9\-_]+)', machines_str, re.IGNORECASE)
                
                machine_totals = {}  # Aggregate same machine types
                
                for qty_str, machine_name in parts:
                    qty = int(qty_str) if qty_str else 1
                    normalized_name = normalize_machine_name(machine_name)
                    
                    if normalized_name in machine_totals:
                        machine_totals[normalized_name] += qty
                    else:
                        machine_totals[normalized_name] = qty
                
                for normalized_name, qty in machine_totals.items():
                    if normalized_name in machine_name_map:
                        mt = machine_name_map[normalized_name]
                        machines.append({
                            "machine_type_id": mt["id"],
                            "machine_name": mt["name"],
                            "quantity": qty
                        })
                        total_fee += mt["monthly_fee"] * qty
            
            # Use provided fee if machines couldn't be parsed
            if total_fee == 0:
                total_fee = fee
            
            # Normalize status
            if status in ['paused', 'pause', 'inactive', 'off']:
                status = 'paused'
            else:
                status = 'active'
            
            customer = Customer(
                name=name,
                phone=phone,
                machines=machines,
                total_cost=cost,
                total_fee=total_fee,
                status=status,
                prepaid_months=prepaid
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

# ==================== CUSTOMER PORTAL ====================

@api_router.post("/portal/login")
async def customer_login(username: str, password: str):
    """Customer login"""
    account = await db.customer_accounts.find_one({
        "username": username.lower().strip(),
        "password": password
    }, {"_id": 0})
    
    if not account:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    customer = await db.customers.find_one({"id": account["customer_id"]}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {
        "success": True,
        "account": account,
        "customer": customer
    }

@api_router.get("/portal/dashboard/{customer_id}")
async def get_customer_dashboard(customer_id: str):
    """Get customer dashboard data"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get machine statuses
    machine_statuses = await db.machine_statuses.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    
    # Get payments
    payments = await db.payments.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    
    # Get maintenance logs
    logs = await db.maintenance_logs.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    
    # Get farm stats with fluctuation
    import random
    farm_stats = await db.farm_stats.find_one({"id": "farm_stats"}, {"_id": 0})
    if not farm_stats:
        farm_stats = {"machines_online": 2430, "machines_offline": 10, "total_hashrate": "850 TH/s", "fluctuation": 5}
    
    fluct = farm_stats.get("fluctuation", 5)
    farm_stats["machines_online_display"] = farm_stats["machines_online"] + random.randint(-fluct, fluct)
    farm_stats["machines_offline_display"] = max(0, farm_stats["machines_offline"] + random.randint(-2, 2))
    
    return {
        "customer": customer,
        "machine_statuses": machine_statuses,
        "payments": payments,
        "maintenance_logs": logs,
        "farm_stats": farm_stats
    }

@api_router.get("/portal/crypto-prices")
async def get_crypto_prices():
    """Get live crypto prices for earnings calculation"""
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.coingecko.com/api/v3/simple/price?ids=litecoin,kaspa,zcash&vs_currencies=usd",
                timeout=10
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {
                        "ltc": data.get("litecoin", {}).get("usd", 0),
                        "kas": data.get("kaspa", {}).get("usd", 0),
                        "zec": data.get("zcash", {}).get("usd", 0)
                    }
    except Exception as e:
        pass
    
    # Fallback prices
    return {"ltc": 85, "kas": 0.12, "zec": 35}

# ==================== CUSTOMER ACCOUNTS (Admin) ====================

@api_router.get("/customer-accounts")
async def get_customer_accounts():
    accounts = await db.customer_accounts.find({}, {"_id": 0}).to_list(1000)
    return accounts

@api_router.post("/customer-accounts")
async def create_customer_account(data: CustomerAccountCreate):
    # Check if account already exists
    existing = await db.customer_accounts.find_one({"customer_id": data.customer_id})
    if existing:
        raise HTTPException(status_code=400, detail="Account already exists for this customer")
    
    account = CustomerAccount(
        customer_id=data.customer_id,
        username=data.username.lower().strip().replace(" ", ""),
        password=data.password,
        worker_name=data.worker_name
    )
    await db.customer_accounts.insert_one(account.model_dump())
    return account

@api_router.put("/customer-accounts/{account_id}")
async def update_customer_account(account_id: str, data: dict):
    if "username" in data:
        data["username"] = data["username"].lower().strip().replace(" ", "")
    
    result = await db.customer_accounts.find_one_and_update(
        {"id": account_id},
        {"$set": data},
        return_document=True,
        projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Account not found")
    return result

@api_router.delete("/customer-accounts/{account_id}")
async def delete_customer_account(account_id: str):
    result = await db.customer_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Deleted"}

# ==================== MAINTENANCE LOGS ====================

@api_router.get("/maintenance-logs")
async def get_maintenance_logs(customer_id: Optional[str] = None):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    logs = await db.maintenance_logs.find(query, {"_id": 0}).to_list(1000)
    return logs

@api_router.post("/maintenance-logs")
async def create_maintenance_log(data: MaintenanceLogCreate):
    log = MaintenanceLog(
        customer_id=data.customer_id,
        machine_info=data.machine_info,
        description=data.description
    )
    await db.maintenance_logs.insert_one(log.model_dump())
    return log

@api_router.delete("/maintenance-logs/{log_id}")
async def delete_maintenance_log(log_id: str):
    result = await db.maintenance_logs.delete_one({"id": log_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Deleted"}

# ==================== FARM STATS (Admin) ====================

@api_router.get("/farm-stats")
async def get_farm_stats():
    stats = await db.farm_stats.find_one({"id": "farm_stats"}, {"_id": 0})
    if not stats:
        new_stats = FarmStats()
        doc = new_stats.model_dump()
        await db.farm_stats.insert_one(doc)
        stats = await db.farm_stats.find_one({"id": "farm_stats"}, {"_id": 0})
    return stats

@api_router.put("/farm-stats")
async def update_farm_stats(data: FarmStatsUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.farm_stats.find_one_and_update(
        {"id": "farm_stats"},
        {"$set": update_data},
        upsert=True,
        return_document=True,
        projection={"_id": 0}
    )
    return result

# ==================== MACHINE STATUS (Admin) ====================

@api_router.get("/machine-statuses")
async def get_machine_statuses(customer_id: Optional[str] = None):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    statuses = await db.machine_statuses.find(query, {"_id": 0}).to_list(1000)
    return statuses

@api_router.post("/machine-statuses")
async def create_or_update_machine_status(customer_id: str, worker_name: str, status: str = "online", hashrate: str = "0 TH/s", temperature: str = "0°C", uptime: str = "0h"):
    existing = await db.machine_statuses.find_one({"customer_id": customer_id, "worker_name": worker_name})
    
    if existing:
        result = await db.machine_statuses.find_one_and_update(
            {"customer_id": customer_id, "worker_name": worker_name},
            {"$set": {
                "status": status,
                "hashrate": hashrate,
                "temperature": temperature,
                "uptime": uptime,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }},
            return_document=True,
            projection={"_id": 0}
        )
        return result
    else:
        machine_status = MachineStatus(
            customer_id=customer_id,
            worker_name=worker_name,
            status=status,
            hashrate=hashrate,
            temperature=temperature,
            uptime=uptime
        )
        await db.machine_statuses.insert_one(machine_status.model_dump())
        return machine_status

@api_router.delete("/machine-statuses/{status_id}")
async def delete_machine_status(status_id: str):
    result = await db.machine_statuses.delete_one({"id": status_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Status not found")
    return {"message": "Deleted"}

# ==================== VIABTC SETTINGS ====================

@api_router.get("/viabtc-settings")
async def get_viabtc_settings():
    settings = await db.viabtc_settings.find_one({"id": "viabtc_settings"}, {"_id": 0})
    if not settings:
        settings = ViaBTCSettings().model_dump()
    # Don't return secret key in full
    if settings.get("secret_key"):
        settings["secret_key_masked"] = "****" + settings["secret_key"][-4:] if len(settings["secret_key"]) > 4 else "****"
    return settings

@api_router.put("/viabtc-settings")
async def update_viabtc_settings(access_key: str = "", secret_key: str = "", enabled: bool = False):
    result = await db.viabtc_settings.find_one_and_update(
        {"id": "viabtc_settings"},
        {"$set": {
            "access_key": access_key,
            "secret_key": secret_key,
            "enabled": enabled
        }},
        upsert=True,
        return_document=True,
        projection={"_id": 0}
    )
    return result

# ==================== AUTO-CREATE CUSTOMER ACCOUNTS ====================

@api_router.post("/auto-create-accounts")
async def auto_create_customer_accounts():
    """Auto-create accounts for all customers without accounts"""
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    existing_accounts = await db.customer_accounts.find({}, {"_id": 0}).to_list(1000)
    existing_customer_ids = {a["customer_id"] for a in existing_accounts}
    
    created = 0
    for customer in customers:
        if customer["id"] not in existing_customer_ids:
            # Generate username from name
            username = customer["name"].lower().strip().replace(" ", "")
            
            # Generate password from last 4 digits of phone
            phone = customer.get("phone", "").replace(" ", "").replace("-", "").replace("+", "")
            password = phone[-4:] if len(phone) >= 4 else "0000"
            
            # Worker name same as username
            worker_name = username
            
            account = CustomerAccount(
                customer_id=customer["id"],
                username=username,
                password=password,
                worker_name=worker_name
            )
            await db.customer_accounts.insert_one(account.model_dump())
            created += 1
    
    return {"message": f"Created {created} accounts"}

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
