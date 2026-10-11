"""The gateway serves no pages of its own: old page URLs redirect to the web app."""

import pytest
from fastapi.testclient import TestClient

from apprentice import gateway


@pytest.fixture
def client(shop_db):
    with TestClient(gateway.app, follow_redirects=False) as c:
        yield c


@pytest.mark.parametrize(
    "path, target",
    [("/", "/"), ("/dashboard", "/dashboard"), ("/shop", "/kirana"), ("/kirana", "/kirana"), ("/support", "/support")],
)
def test_old_pages_redirect_to_the_web_app(client, monkeypatch, path, target):
    monkeypatch.setenv("WEB_URL", "http://web.test:3100/")
    r = client.get(path)
    assert r.status_code == 307
    assert r.headers["location"] == f"http://web.test:3100{target}"


def test_default_web_url(client, monkeypatch):
    monkeypatch.delenv("WEB_URL", raising=False)
    assert client.get("/shop").headers["location"] == "http://localhost:3100/kirana"


@pytest.mark.parametrize("path", ["/health.js", "/support/support.js", "/support/support.css"])
def test_old_assets_are_gone(client, path):
    assert client.get(path).status_code == 404


def test_apis_are_unchanged(client):
    assert client.get("/api/stats").status_code == 200
    assert client.get("/api/shop/examples").status_code == 200
    assert client.get("/api/support/questions").status_code == 200
