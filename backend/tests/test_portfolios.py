from tests.conftest import register


def create_portfolio(client, headers, name="Main"):
    r = client.post("/api/portfolios/", json={"name": name, "initial_value": 0}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_portfolio_crud(client):
    headers = register(client)
    p = create_portfolio(client, headers)

    listed = client.get("/api/portfolios/", headers=headers).json()
    assert [x["id"] for x in listed] == [p["id"]]

    r = client.put(f"/api/portfolios/{p['id']}", json={"name": "Renamed"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"

    assert client.delete(f"/api/portfolios/{p['id']}", headers=headers).status_code == 204
    assert client.get(f"/api/portfolios/{p['id']}", headers=headers).status_code == 404


def test_portfolios_are_private(client):
    alice = register(client, "alice@example.com")
    bob = register(client, "bob@example.com")
    p = create_portfolio(client, alice)

    assert client.get(f"/api/portfolios/{p['id']}", headers=bob).status_code == 404
    assert client.get(f"/api/portfolios/{p['id']}/assets", headers=bob).status_code == 404
    assert client.delete(f"/api/portfolios/{p['id']}", headers=bob).status_code == 404
    assert client.get("/api/portfolios/", headers=bob).json() == []


def test_add_asset_values_and_portfolio_totals(client):
    headers = register(client)
    p = create_portfolio(client, headers)

    r = client.post(
        f"/api/portfolios/{p['id']}/assets",
        json={"symbol": "reliance", "name": "Reliance", "quantity": 10, "average_cost": 80},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    asset = r.json()
    assert asset["symbol"] == "RELIANCE.NS"          # NSE suffix added
    assert asset["current_price"] == 100.0           # stubbed price
    assert asset["total_cost"] == 800
    assert asset["current_value"] == 1000
    assert asset["unrealized_gain_loss"] == 200
    assert asset["portfolio_percentage"] == 100

    portfolio = client.get(f"/api/portfolios/{p['id']}", headers=headers).json()
    assert portfolio["current_value"] == 1000
    assert portfolio["total_returns"] == 200
    assert portfolio["total_returns_percentage"] == 25
