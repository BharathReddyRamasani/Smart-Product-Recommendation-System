import requests
import time
import json
import random

BASE_URL = "http://localhost:8000/api/v1"

def print_step(title):
    print(f"\n{'='*50}\n▶ {title}\n{'='*50}")

def verify_flows():
    print_step("1. User Signup & Cold Start Test")
    
    email = f"test_{int(time.time())}@example.com"
    res = requests.post(f"{BASE_URL}/auth/signup", json={
        "name": "Test User",
        "email": email,
        "password": "password123",
        "age": 25,
        "location": "NY"
    })
    
    if res.status_code != 201:
        print("Failed to sign up:", res.json())
        return
        
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"User created: {email}")

    # Check initial home feed
    res = requests.get(f"{BASE_URL}/recommend/user", headers=headers)
    data = res.json()
    print(f"Initial Strategy: {data['strategy']} (Expected: popularity)")
    
    if data['strategy'] != "popularity":
        print("❌ Cold start test failed")
        return
    print("✅ Cold start test passed")
    
    # 2. Cart to Order Test
    print_step("2. Cart → Order → ML Push Test")
    products_res = requests.get(f"{BASE_URL}/products?limit=5")
    products = products_res.json()
    p1 = products[0]["id"]
    p2 = products[1]["id"]
    
    print(f"Adding products {p1} and {p2} to cart...")
    res1 = requests.post(f"{BASE_URL}/cart/add", headers=headers, json={"product_id": p1, "quantity": 1})
    if res1.status_code != 201:
        print(f"Cart Add 1 failed: {res1.text}")
    res2 = requests.post(f"{BASE_URL}/cart/add", headers=headers, json={"product_id": p2, "quantity": 2})
    if res2.status_code != 200:
        print(f"Cart Add 2 failed: {res2.text}")
    
    print("Placing order...")
    res = requests.post(f"{BASE_URL}/orders/place", headers=headers)
    order = res.json()
    if res.status_code != 201:
        print(f"Checkout failed: {order}")
        return
    print(f"Order created with total: ${order['total']}")
    
    print("Verifying interactions were logged...")
    res = requests.get(f"{BASE_URL}/interaction/user", headers=headers)
    interactions = res.json()
    
    purchase_count = sum(1 for i in interactions if i["interaction_type"] == "purchase")
    print(f"Found {purchase_count} purchase interactions. (Expected: 3)")
    if purchase_count != 3:
        print("❌ Purchase logging test failed")
        return
    print("✅ Purchase logging test passed")
    
    # 3. Recommendation Change Test (triggering batch retrain)
    print_step("3. Batch Retrain Trigger Test")
    print("Simulating 15 views to trigger the hybrid strategy and batch retrain...")
    
    for _ in range(15):
        pid = random.choice(products)["id"]
        requests.post(f"{BASE_URL}/interaction", headers=headers, json={
            "product_id": pid,
            "interaction_type": "view"
        })
        time.sleep(0.05)
        
    print("Interactions injected. Checking new recommendation strategy...")
    res = requests.get(f"{BASE_URL}/recommend/user", headers=headers)
    data = res.json()
    print(f"New Strategy: {data['strategy']} (Expected: content or hybrid)")
    
    if data['strategy'] in ["content", "hybrid"]:
        print("✅ Recommendation strategy shift passed")
    else:
        print("❌ Recommendation shift failed")
        
    print_step("4. Error Handling Test")
    res = requests.post(f"{BASE_URL}/auth/signup", json={"bad": "payload"})
    print(f"Validation Error Status Code: {res.status_code}")
    err_json = res.json()
    print(f"Validation Error Structure: {list(err_json.keys())}")
    
    if err_json.get("error") is True and "status_code" in err_json:
        print("✅ Structured error handling passed")
    else:
        print("❌ Error handling test failed")

if __name__ == "__main__":
    verify_flows()
