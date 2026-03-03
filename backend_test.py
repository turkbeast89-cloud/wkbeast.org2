import requests
import sys
import json
from datetime import datetime

class CryptoFarmAPITester:
    def __init__(self, base_url="https://crypto-ops-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.machine_types = []
        self.customers = []
        self.payments = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"   ✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"   ❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"   ❌ Failed - Error: {str(e)}")
            return False, {}

    def test_init_data(self):
        """Test initialization of default machine types"""
        print("\n=== Testing Data Initialization ===")
        success, response = self.run_test(
            "Initialize Default Data",
            "POST",
            "init",
            200
        )
        return success

    def test_machine_types(self):
        """Test machine types CRUD operations"""
        print("\n=== Testing Machine Types ===")
        
        # Get machine types
        success, response = self.run_test(
            "Get Machine Types",
            "GET", 
            "machine-types",
            200
        )
        if success:
            self.machine_types = response
            print(f"   Found {len(self.machine_types)} machine types")
            
            # Verify default types exist
            expected_types = ["L1", "L7", "L9", "Ks5pro", "Z15pro"]
            found_types = [mt["name"] for mt in self.machine_types]
            for expected in expected_types:
                if expected in found_types:
                    print(f"   ✅ Found expected machine type: {expected}")
                else:
                    print(f"   ❌ Missing expected machine type: {expected}")

        # Test creating a new machine type
        success, response = self.run_test(
            "Create Machine Type",
            "POST",
            "machine-types",
            200,
            data={"name": "TestMachine", "monthly_fee": 150}
        )
        if success and response:
            test_machine_id = response.get("id")
            
            # Test updating machine type
            self.run_test(
                "Update Machine Type",
                "PUT",
                f"machine-types/{test_machine_id}",
                200,
                data={"name": "TestMachineUpdated", "monthly_fee": 175}
            )
            
            # Test deleting machine type
            self.run_test(
                "Delete Machine Type",
                "DELETE",
                f"machine-types/{test_machine_id}",
                200
            )

        return success

    def test_customers(self):
        """Test customer CRUD operations"""
        print("\n=== Testing Customers ===")
        
        # Get customers
        success, response = self.run_test(
            "Get Customers",
            "GET",
            "customers",
            200
        )
        if success:
            self.customers = response

        # Create a test customer with machines
        if self.machine_types:
            machine_data = []
            # Add 2x L1 and 1x L7 machines
            for mt in self.machine_types:
                if mt["name"] == "L1":
                    machine_data.append({
                        "machine_type_id": mt["id"],
                        "quantity": 2
                    })
                elif mt["name"] == "L7":
                    machine_data.append({
                        "machine_type_id": mt["id"],
                        "quantity": 1
                    })

            success, response = self.run_test(
                "Create Customer",
                "POST",
                "customers",
                200,
                data={
                    "name": "Test Customer",
                    "phone": "+961123456789",
                    "machines": machine_data,
                    "total_cost": 250,
                    "status": "active",
                    "prepaid_months": 1,
                    "notes": "Test customer"
                }
            )
            
            if success and response:
                test_customer_id = response.get("id")
                print(f"   Created customer with total fee: ${response.get('total_fee', 0)}")
                
                # Test getting single customer
                self.run_test(
                    "Get Single Customer",
                    "GET",
                    f"customers/{test_customer_id}",
                    200
                )
                
                # Test updating customer
                self.run_test(
                    "Update Customer",
                    "PUT",
                    f"customers/{test_customer_id}",
                    200,
                    data={"name": "Updated Test Customer", "status": "paused"}
                )
                
                # Store for payment tests
                self.customers.append(response)
                
                return success, test_customer_id

        return False, None

    def test_payments(self, customer_id=None):
        """Test payment operations"""
        print("\n=== Testing Payments ===")
        
        current_month = datetime.now().strftime("%Y-%m")
        
        # Generate payments for current month
        success, response = self.run_test(
            "Generate Monthly Payments",
            "POST",
            f"payments/generate?month={current_month}",
            200
        )
        
        # Get payments for current month
        success, response = self.run_test(
            "Get Payments",
            "GET",
            f"payments?month={current_month}",
            200
        )
        
        if success:
            self.payments = response
            print(f"   Found {len(self.payments)} payments for {current_month}")
            
            # Test updating payment status if we have payments
            if self.payments and customer_id:
                test_payment = None
                for payment in self.payments:
                    if payment.get("customer_id") == customer_id:
                        test_payment = payment
                        break
                
                if test_payment:
                    payment_id = test_payment["id"]
                    
                    # Test marking as paid
                    self.run_test(
                        "Mark Payment as Paid",
                        "PUT",
                        f"payments/{payment_id}",
                        200,
                        data={"status": "paid"}
                    )
                    
                    # Test marking as unpaid
                    self.run_test(
                        "Mark Payment as Unpaid", 
                        "PUT",
                        f"payments/{payment_id}",
                        200,
                        data={"status": "unpaid"}
                    )
                    
                    # Test marking as paused
                    self.run_test(
                        "Mark Payment as Paused",
                        "PUT", 
                        f"payments/{payment_id}",
                        200,
                        data={"status": "paused"}
                    )

        return success

    def test_stats(self):
        """Test statistics endpoint"""
        print("\n=== Testing Statistics ===")
        
        success, response = self.run_test(
            "Get Stats",
            "GET",
            "stats", 
            200
        )
        
        if success and response:
            expected_fields = [
                "total_customers", "active_customers", "paused_customers",
                "total_monthly_revenue", "total_monthly_cost", "monthly_profit",
                "profit_margin", "total_collected", "total_pending", 
                "monthly_stats", "machine_counts"
            ]
            
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ Stats includes {field}: {response[field]}")
                else:
                    print(f"   ❌ Stats missing {field}")
        
        return success

    def test_settings(self):
        """Test settings operations"""
        print("\n=== Testing Settings ===")
        
        # Get settings
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200
        )
        
        if success:
            # Test updating settings
            success, response = self.run_test(
                "Update Settings",
                "PUT", 
                "settings",
                200,
                data={
                    "team_name": "Test Team",
                    "whish_number": "99999999",
                    "message_template": "Test message template"
                }
            )
        
        return success

    def test_whatsapp_links(self):
        """Test WhatsApp link generation"""
        print("\n=== Testing WhatsApp Links ===")
        
        current_month = datetime.now().strftime("%Y-%m")
        
        # Generate WhatsApp links for unpaid customers
        success, response = self.run_test(
            "Generate WhatsApp Links (Unpaid Only)",
            "POST",
            f"whatsapp/generate-links?month={current_month}&include_paid=false",
            200
        )
        
        if success:
            print(f"   Generated {len(response)} WhatsApp links")
            
        # Generate WhatsApp links including paid customers
        success, response = self.run_test(
            "Generate WhatsApp Links (Include Paid)",
            "POST", 
            f"whatsapp/generate-links?month={current_month}&include_paid=true",
            200
        )
        
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        print("\n=== Testing Root Endpoint ===")
        
        success, response = self.run_test(
            "Root API",
            "GET",
            "",
            200
        )
        
        return success

    def cleanup_test_data(self, customer_id):
        """Clean up test customer"""
        if customer_id:
            print("\n=== Cleaning Up Test Data ===")
            self.run_test(
                "Delete Test Customer",
                "DELETE",
                f"customers/{customer_id}",
                200
            )

def main():
    """Main test execution"""
    print("🚀 Starting Crypto Farm API Tests")
    print("=" * 50)
    
    tester = CryptoFarmAPITester()
    test_customer_id = None
    
    try:
        # Run all tests
        tester.test_root_endpoint()
        tester.test_init_data()
        tester.test_machine_types()
        success, test_customer_id = tester.test_customers()
        tester.test_payments(test_customer_id)
        tester.test_stats()
        tester.test_settings()
        tester.test_whatsapp_links()
        
    finally:
        # Always cleanup
        if test_customer_id:
            tester.cleanup_test_data(test_customer_id)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())