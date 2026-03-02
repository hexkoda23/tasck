#!/usr/bin/env python3
"""
TASCK OS Backend API Testing Suite
Tests all backend endpoints for the Nigerian creative economy demo platform
"""
import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Any

class TASCKAPITester:
    def __init__(self, base_url: str = "https://tasck-live-demo-1.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.results = {}

    def log_result(self, test_name: str, success: bool, details: Dict[str, Any] = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name}")
            self.failed_tests.append({
                'test': test_name,
                'details': details or {}
            })
        
        self.results[test_name] = {
            'success': success,
            'details': details or {}
        }

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{self.api_base}/")
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_result("GET /api/ (Root)", success, {
                'status_code': response.status_code,
                'data': data
            })
        except Exception as e:
            self.log_result("GET /api/ (Root)", False, {'error': str(e)})

        # Test health endpoint
        try:
            response = self.session.get(f"{self.api_base}/health")
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_result("GET /api/health", success, {
                'status_code': response.status_code,
                'data': data
            })
        except Exception as e:
            self.log_result("GET /api/health", False, {'error': str(e)})

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication...")
        
        # Test each role login
        roles = ['staff', 'brand', 'super_creative', 'creative', 'admin']
        
        for role in roles:
            try:
                response = self.session.post(f"{self.api_base}/auth/demo-login", 
                    json={"role": role})
                success = response.status_code == 200
                data = response.json() if success else {}
                
                self.log_result(f"POST /api/auth/demo-login ({role})", success, {
                    'status_code': response.status_code,
                    'has_user': 'user' in data,
                    'has_token': 'token' in data
                })
            except Exception as e:
                self.log_result(f"POST /api/auth/demo-login ({role})", False, {'error': str(e)})

    def test_brand_endpoints(self):
        """Test brand endpoints"""
        print("\n🔍 Testing Brand Endpoints...")
        
        # Get all brands
        try:
            response = self.session.get(f"{self.api_base}/brands")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/brands", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/brands", False, {'error': str(e)})

        # Get specific brand
        try:
            response = self.session.get(f"{self.api_base}/brands/brand-001")
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_result("GET /api/brands/brand-001", success, {
                'status_code': response.status_code,
                'has_name': 'name' in data
            })
        except Exception as e:
            self.log_result("GET /api/brands/brand-001", False, {'error': str(e)})

    def test_deal_endpoints(self):
        """Test deal endpoints"""
        print("\n🔍 Testing Deal Endpoints...")
        
        # Get all deals
        try:
            response = self.session.get(f"{self.api_base}/deals")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/deals", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/deals", False, {'error': str(e)})

        # Get deals pipeline summary
        try:
            response = self.session.get(f"{self.api_base}/deals/pipeline/summary")
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_result("GET /api/deals/pipeline/summary", success, {
                'status_code': response.status_code,
                'has_summary': 'summary' in data,
                'has_deals_by_status': 'deals_by_status' in data
            })
        except Exception as e:
            self.log_result("GET /api/deals/pipeline/summary", False, {'error': str(e)})

    def test_super_creative_endpoints(self):
        """Test super creative endpoints"""
        print("\n🔍 Testing Super Creative Endpoints...")
        
        # Get all super creatives
        try:
            response = self.session.get(f"{self.api_base}/super-creatives")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/super-creatives", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/super-creatives", False, {'error': str(e)})

        # Get super creative stats
        try:
            response = self.session.get(f"{self.api_base}/stats/super-creative/sc-001")
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_result("GET /api/stats/super-creative/sc-001", success, {
                'status_code': response.status_code,
                'has_wallet': 'wallet_balance' in data
            })
        except Exception as e:
            self.log_result("GET /api/stats/super-creative/sc-001", False, {'error': str(e)})

    def test_creative_endpoints(self):
        """Test creative endpoints"""
        print("\n🔍 Testing Creative Endpoints...")
        
        # Get all creatives
        try:
            response = self.session.get(f"{self.api_base}/creatives")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/creatives", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/creatives", False, {'error': str(e)})

        # Get creative stats
        try:
            response = self.session.get(f"{self.api_base}/stats/creative/cr-001")
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_result("GET /api/stats/creative/cr-001", success, {
                'status_code': response.status_code,
                'has_wallet': 'wallet_balance' in data
            })
        except Exception as e:
            self.log_result("GET /api/stats/creative/cr-001", False, {'error': str(e)})

    def test_staff_endpoints(self):
        """Test staff endpoints"""
        print("\n🔍 Testing Staff Endpoints...")
        
        # Get staff stats
        try:
            response = self.session.get(f"{self.api_base}/stats/staff/staff-001")
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_result("GET /api/stats/staff/staff-001", success, {
                'status_code': response.status_code,
                'has_deals': 'active_deals' in data,
                'has_pipeline': 'pipeline_value' in data
            })
        except Exception as e:
            self.log_result("GET /api/stats/staff/staff-001", False, {'error': str(e)})

    def test_activity_endpoints(self):
        """Test activity endpoints"""
        print("\n🔍 Testing Activity Endpoints...")
        
        # Get activities
        try:
            response = self.session.get(f"{self.api_base}/activities")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/activities", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/activities", False, {'error': str(e)})

    def test_copilot_endpoints(self):
        """Test AI copilot endpoints"""
        print("\n🔍 Testing Copilot Endpoints...")
        
        # Get copilot recommendations
        try:
            response = self.session.get(f"{self.api_base}/copilot/recommendations")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/copilot/recommendations", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/copilot/recommendations", False, {'error': str(e)})

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n🔍 Testing Admin Endpoints...")
        
        # Get admin stats
        try:
            response = self.session.get(f"{self.api_base}/stats/admin")
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_result("GET /api/stats/admin", success, {
                'status_code': response.status_code,
                'has_users': 'total_users' in data,
                'has_disputes': 'active_disputes' in data
            })
        except Exception as e:
            self.log_result("GET /api/stats/admin", False, {'error': str(e)})

    def test_opportunities_endpoints(self):
        """Test opportunities endpoints"""
        print("\n🔍 Testing Opportunities Endpoints...")
        
        # Get opportunities
        try:
            response = self.session.get(f"{self.api_base}/opportunities")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/opportunities", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/opportunities", False, {'error': str(e)})

        # Get open opportunities
        try:
            response = self.session.get(f"{self.api_base}/opportunities/open")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/opportunities/open", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/opportunities/open", False, {'error': str(e)})

    def test_tasks_endpoints(self):
        """Test tasks endpoints"""
        print("\n🔍 Testing Tasks Endpoints...")
        
        # Get tasks
        try:
            response = self.session.get(f"{self.api_base}/tasks")
            success = response.status_code == 200
            data = response.json() if success else []
            self.log_result("GET /api/tasks", success, {
                'status_code': response.status_code,
                'count': len(data) if isinstance(data, list) else 0
            })
        except Exception as e:
            self.log_result("GET /api/tasks", False, {'error': str(e)})

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting TASCK OS Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Run all test suites
        self.test_health_endpoints()
        self.test_auth_endpoints()
        self.test_brand_endpoints()
        self.test_deal_endpoints()
        self.test_super_creative_endpoints()
        self.test_creative_endpoints()
        self.test_staff_endpoints()
        self.test_activity_endpoints()
        self.test_copilot_endpoints()
        self.test_admin_endpoints()
        self.test_opportunities_endpoints()
        self.test_tasks_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for failure in self.failed_tests:
                print(f"   • {failure['test']}")
                if 'error' in failure['details']:
                    print(f"     Error: {failure['details']['error']}")
                if 'status_code' in failure['details']:
                    print(f"     Status: {failure['details']['status_code']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as passing

def main():
    """Main test runner"""
    tester = TASCKAPITester()
    success = tester.run_all_tests()
    
    # Save results to file for analysis
    with open('/tmp/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'tests_run': tester.tests_run,
            'tests_passed': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'failed_tests': tester.failed_tests,
            'results': tester.results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())