import hashlib
import secrets

from app.models import LocalUser
from app.rate_limit import limiter
from tests.conftest import register


def test_register_stores_bcrypt_hash(client, db_session):
    register(client)
    db = db_session()
    user = db.query(LocalUser).filter_by(email="user@example.com").one()
    assert user.password_hash.startswith("$2")
    db.close()


def test_register_rejects_weak_password(client):
    r = client.post("/api/auth/register", json={"email": "a@example.com", "password": "short"})
    assert r.status_code == 422


def test_register_duplicate_email(client):
    register(client)
    r = client.post("/api/auth/register", json={"email": "user@example.com", "password": "Passw0rdX"})
    assert r.status_code == 400


def test_login_and_me(client):
    register(client)
    r = client.post("/api/auth/login", json={"email": "user@example.com", "password": "Passw0rdX"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "user@example.com"


def test_login_wrong_password(client):
    register(client)
    r = client.post("/api/auth/login", json={"email": "user@example.com", "password": "WrongPass1"})
    assert r.status_code == 401


def test_me_requires_valid_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_legacy_sha256_hash_is_upgraded_on_login(client, db_session):
    db = db_session()
    salt = secrets.token_hex(16)
    legacy = f"{salt}${hashlib.sha256((salt + 'OldPassw0rd').encode()).hexdigest()}"
    db.add(LocalUser(email="old@example.com", full_name="Old", password_hash=legacy, is_active=True))
    db.commit()

    r = client.post("/api/auth/login", json={"email": "old@example.com", "password": "OldPassw0rd"})
    assert r.status_code == 200

    db.expire_all()
    user = db.query(LocalUser).filter_by(email="old@example.com").one()
    assert user.password_hash.startswith("$2")
    db.close()

    # still works after the upgrade
    r = client.post("/api/auth/login", json={"email": "old@example.com", "password": "OldPassw0rd"})
    assert r.status_code == 200


def test_login_rate_limited(client):
    register(client)
    limiter.enabled = True
    limiter.reset()
    codes = [
        client.post("/api/auth/login", json={"email": "user@example.com", "password": "WrongPass1"}).status_code
        for _ in range(6)
    ]
    assert codes[:5] == [401] * 5
    assert codes[5] == 429
