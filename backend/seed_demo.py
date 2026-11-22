"""
Seed a demo account with realistic Indian-market portfolios.

Goes through the running API (http://localhost:8000) so holdings, prices and
returns are calculated by the same code the app uses. Safe to re-run: the demo
account's existing portfolios are deleted and recreated.

Usage (backend must be running):
    venv\\Scripts\\python seed_demo.py
"""

import sys
import requests

API = "http://localhost:8000"
DEMO_EMAIL = "demo@inviai.app"
DEMO_PASSWORD = "Demo@2026"
DEMO_NAME = "Aarav Mehta"

# (symbol, name, quantity, return since purchase). The buy price is derived
# from the live price, so the demo always shows realistic gains/losses.
PORTFOLIOS = [
    {
        "name": "Long Term Wealth",
        "description": "Blue-chip NSE stocks held for 5+ years",
        "holdings": [
            ("RELIANCE", "Reliance Industries Ltd", 40, 0.14),
            ("TCS", "Tata Consultancy Services Ltd", 20, -0.06),
            ("HDFCBANK", "HDFC Bank Ltd", 60, 0.18),
            ("INFY", "Infosys Ltd", 35, 0.09),
            ("ITC", "ITC Ltd", 150, 0.05),
        ],
    },
    {
        "name": "Growth Picks",
        "description": "Higher-growth large and mid caps",
        "holdings": [
            ("BAJFINANCE", "Bajaj Finance Ltd", 50, 0.27),
            ("TITAN", "Titan Company Ltd", 15, 0.21),
            ("BHARTIARTL", "Bharti Airtel Ltd", 30, 0.32),
            ("TMPV", "Tata Motors Passenger Vehicles Ltd", 120, -0.11),
        ],
    },
]


def main():
    session = requests.Session()

    # Register, or log in if the demo account already exists
    r = session.post(f"{API}/api/auth/register",
                     json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD, "full_name": DEMO_NAME})
    if r.status_code not in (200, 201):
        r = session.post(f"{API}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    r.raise_for_status()
    session.headers["Authorization"] = f"Bearer {r.json()['access_token']}"

    # Start clean
    for p in session.get(f"{API}/api/portfolios/").json():
        session.delete(f"{API}/api/portfolios/{p['id']}")

    for spec in PORTFOLIOS:
        portfolio = session.post(f"{API}/api/portfolios/",
                                 json={"name": spec["name"], "description": spec["description"]})
        portfolio.raise_for_status()
        pid = portfolio.json()["id"]

        for symbol, name, qty, gain in spec["holdings"]:
            quote = session.get(f"{API}/api/market/quote/{symbol}.NS")
            quote.raise_for_status()
            cost = round(quote.json()["current_price"] / (1 + gain), 2)
            asset = session.post(f"{API}/api/portfolios/{pid}/assets", json={
                "symbol": symbol, "name": name, "asset_type": "stock",
                "quantity": qty, "average_cost": cost, "exchange": "NSE",
            })
            asset.raise_for_status()
            # Record the purchase in the transaction history (amount only, holdings already set)
            session.post(f"{API}/api/portfolios/{pid}/transactions", json={
                "transaction_type": "BUY", "amount": qty * cost,
                "notes": f"Bought {qty} {symbol} @ Rs {cost}",
            })

        summary = session.get(f"{API}/api/portfolios/{pid}").json()
        print(f"{spec['name']}: value Rs {summary['current_value']:,.0f}, "
              f"return {summary['total_returns_percentage']:+.2f}%")

    print(f"\nDemo login: {DEMO_EMAIL}")


if __name__ == "__main__":
    try:
        main()
    except requests.ConnectionError:
        sys.exit("Backend is not running on http://localhost:8000; start it first.")
