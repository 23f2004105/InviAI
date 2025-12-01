"""Direct test of auth functions"""
import sys
sys.path.insert(0, 'd:\\PROJECTS\\InviAI\\InviAI Full\\backend')

from app.routers.auth_local import hash_password, verify_password

# Test password hashing
password = "password123"
hashed = hash_password(password)
print(f"Original: {password}")
print(f"Hashed: {hashed}")

# Test verification
is_valid = verify_password(password, hashed)
print(f"Verification: {is_valid}")

is_invalid = verify_password("wrongpassword", hashed)
print(f"Wrong password: {is_invalid}")
