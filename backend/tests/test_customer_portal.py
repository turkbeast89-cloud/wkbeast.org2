"""
Backend API tests for Customer Portal and Admin Panel features
Tests: Customer Portal login, dashboard, crypto prices, farm stats, customer accounts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crypto-hash-track.preview.emergentagent.com')

# Test credentials
TEST_USERNAME = "hamid"
TEST_PASSWORD = "9323"
TEST_CUSTOMER_ID = "c5cc9178-14bc-4175-b911-855495e1e980"
ADMIN_PASSWORD = "1122"


class TestCustomerPortalLogin:
    """Customer Portal login endpoint tests"""
    
    def test_login_success(self):
        """Test successful customer login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/portal/login",
            params={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "account" in data
        assert "customer" in data
        assert data["account"]["username"] == TEST_USERNAME
        assert data["customer"]["id"] == TEST_CUSTOMER_ID
    
    def test_login_invalid_username(self):
        """Test login with invalid username"""
        response = requests.post(
            f"{BASE_URL}/api/portal/login",
            params={"username": "wronguser", "password": TEST_PASSWORD}
        )
        assert response.status_code == 401
    
    def test_login_invalid_password(self):
        """Test login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/portal/login",
            params={"username": TEST_USERNAME, "password": "0000"}
        )
        assert response.status_code == 401
    
    def test_login_empty_credentials(self):
        """Test login with empty credentials"""
        response = requests.post(
            f"{BASE_URL}/api/portal/login",
            params={"username": "", "password": ""}
        )
        assert response.status_code == 401


class TestCustomerDashboard:
    """Customer Dashboard endpoint tests"""
    
    def test_get_dashboard_valid_customer(self):
        """Test fetching dashboard for valid customer"""
        response = requests.get(f"{BASE_URL}/api/portal/dashboard/{TEST_CUSTOMER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        # Verify customer data
        assert "customer" in data
        assert data["customer"]["id"] == TEST_CUSTOMER_ID
        assert data["customer"]["name"] == "hamid"
        assert "machines" in data["customer"]
        assert "total_fee" in data["customer"]
        
        # Verify other dashboard data
        assert "machine_statuses" in data
        assert "payments" in data
        assert "maintenance_logs" in data
        assert "farm_stats" in data
        
        # Verify farm stats have display values with fluctuation
        assert "machines_online_display" in data["farm_stats"]
        assert "machines_offline_display" in data["farm_stats"]
    
    def test_get_dashboard_invalid_customer(self):
        """Test fetching dashboard for non-existent customer"""
        response = requests.get(f"{BASE_URL}/api/portal/dashboard/invalid-uuid-12345")
        assert response.status_code == 404


class TestCryptoPrices:
    """Crypto prices endpoint tests"""
    
    def test_get_crypto_prices(self):
        """Test fetching crypto prices"""
        response = requests.get(f"{BASE_URL}/api/portal/crypto-prices")
        assert response.status_code == 200
        
        data = response.json()
        # Should have prices for LTC, KAS, ZEC
        assert "ltc" in data
        assert "kas" in data
        assert "zec" in data
        
        # Prices should be numbers
        assert isinstance(data["ltc"], (int, float))
        assert isinstance(data["kas"], (int, float))
        assert isinstance(data["zec"], (int, float))
        
        # Prices should be positive or fallback values
        assert data["ltc"] >= 0
        assert data["kas"] >= 0
        assert data["zec"] >= 0


class TestFarmStats:
    """Farm stats endpoint tests"""
    
    def test_get_farm_stats(self):
        """Test fetching farm stats"""
        response = requests.get(f"{BASE_URL}/api/farm-stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "machines_online" in data
        assert "machines_offline" in data
        assert "total_hashrate" in data
        assert "fluctuation" in data
        
        # Validate types
        assert isinstance(data["machines_online"], int)
        assert isinstance(data["machines_offline"], int)
        assert isinstance(data["total_hashrate"], str)
        assert isinstance(data["fluctuation"], int)
    
    def test_update_farm_stats(self):
        """Test updating farm stats"""
        update_data = {
            "machines_online": 2500,
            "machines_offline": 15,
            "total_hashrate": "900 TH/s",
            "fluctuation": 10
        }
        
        response = requests.put(f"{BASE_URL}/api/farm-stats", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["machines_online"] == 2500
        assert data["machines_offline"] == 15
        assert data["total_hashrate"] == "900 TH/s"
        assert data["fluctuation"] == 10
        
        # Restore original values
        restore_data = {
            "machines_online": 2430,
            "machines_offline": 10,
            "total_hashrate": "850 TH/s",
            "fluctuation": 5
        }
        requests.put(f"{BASE_URL}/api/farm-stats", json=restore_data)


class TestCustomerAccounts:
    """Customer accounts endpoint tests"""
    
    def test_get_customer_accounts(self):
        """Test fetching all customer accounts"""
        response = requests.get(f"{BASE_URL}/api/customer-accounts")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least hamid's account
        hamid_account = next((a for a in data if a["username"] == "hamid"), None)
        assert hamid_account is not None
        assert hamid_account["customer_id"] == TEST_CUSTOMER_ID
        assert hamid_account["password"] == TEST_PASSWORD
    
    def test_auto_create_accounts(self):
        """Test auto-create accounts endpoint"""
        response = requests.post(f"{BASE_URL}/api/auto-create-accounts")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        # Should contain count of created accounts
        assert "Created" in data["message"]


class TestMaintenanceLogs:
    """Maintenance logs endpoint tests"""
    
    def test_get_maintenance_logs(self):
        """Test fetching maintenance logs"""
        response = requests.get(f"{BASE_URL}/api/maintenance-logs")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_maintenance_logs_by_customer(self):
        """Test fetching maintenance logs for specific customer"""
        response = requests.get(f"{BASE_URL}/api/maintenance-logs?customer_id={TEST_CUSTOMER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestMachineStatuses:
    """Machine statuses endpoint tests"""
    
    def test_get_machine_statuses(self):
        """Test fetching machine statuses"""
        response = requests.get(f"{BASE_URL}/api/machine-statuses")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_machine_status(self):
        """Test creating/updating machine status"""
        response = requests.post(
            f"{BASE_URL}/api/machine-statuses",
            params={
                "customer_id": TEST_CUSTOMER_ID,
                "worker_name": "test_worker",
                "status": "online",
                "hashrate": "9.5 TH/s",
                "temperature": "65°C",
                "uptime": "720h"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer_id"] == TEST_CUSTOMER_ID
        assert data["worker_name"] == "test_worker"
        assert data["status"] == "online"


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
