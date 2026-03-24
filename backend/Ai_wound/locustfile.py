import random
from locust import HttpUser, task, between

class DjangoAPIUser(HttpUser):
    # Default host to local development server
    host = "http://127.0.0.1:8000"
    
    # Simulate a user waiting between 1 to 5 seconds between actions
    wait_time = between(1, 5)

    def on_start(self):
        """
        Executed when a simulated user starts.
        Randomly picks a test user (Admin, Doctor, or Nurse) and logs in.
        """
        test_users = [
            {"email": "lakshman@hospital.com", "password": "lakshman@123"},
            {"email": "krishna@hospital.com", "password": "krishna@123"},
            {"email": "anu@hospital.com", "password": "anu@123"}
        ]
        
        user_credentials = random.choice(test_users)
        
        response = self.client.post("/patient/api/auth/login/", json=user_credentials)
        
        if response.status_code == 200:
            token = response.json().get("access")
            if token:
                self.client.headers.update({"Authorization": f"Bearer {token}"})
        else:
            print(f"Login failed: {response.status_code} for user {user_credentials['email']}")

    @task(3)
    def view_patient_list(self):
        """High traffic: Fetching patient list from the backend"""
        self.client.get("/patient/api/patients/", name="Fetch Patients List")

    @task(2)
    def view_nurse_dashboard_tasks(self):
        """Medium traffic: Fetching nurse tasks"""
        self.client.get("/nurse_page/tasks/", name="Fetch Nurse Tasks")

    @task(1)
    def view_admin_stats(self):
        """Low traffic: Admin dashboard system stats overview"""
        self.client.get("/admin_page/stats/", name="Fetch Admin Stats")

    @task(2)
    def view_patient_visits(self):
        """Medium traffic: Patient visits route"""
        self.client.get("/patient/api/visits/", name="Fetch Patient Visits")
