"""The SQL verifier: pulling SQL out of a model reply and checking that it runs and returns rows."""

import pytest

from apprentice.verifiers import extract_sql, preview_sql, verify_sql


@pytest.mark.parametrize(
    "reply, expected",
    [
        ("```sql\nSELECT name FROM stores\n```", "SELECT name FROM stores"),
        ("```SQL\nSELECT name FROM stores;\n```", "SELECT name FROM stores"),
        ("```\nSELECT 1\n```", "SELECT 1"),
        ("SELECT name FROM stores", "SELECT name FROM stores"),
        ("Here is the query: SELECT name FROM stores", "SELECT name FROM stores"),
        ("  select name from stores ;", "select name from stores"),
    ],
    ids=["fenced", "fenced-upper-semicolon", "fenced-no-lang", "bare", "prose-then-bare", "lowercase"],
)
def test_extract_sql(reply, expected):
    assert extract_sql(reply) == expected


def test_extract_sql_drops_text_after_the_fence():
    reply = "Sure!\n```sql\nSELECT COUNT(*) FROM orders\n```\nThis counts every order."
    assert extract_sql(reply) == "SELECT COUNT(*) FROM orders"


def test_extract_sql_drops_text_after_the_semicolon():
    assert extract_sql("SELECT COUNT(*) FROM orders; -- that's all") == "SELECT COUNT(*) FROM orders"


def test_extract_sql_keeps_common_table_expressions():
    sql = "WITH t AS (SELECT id FROM stores) SELECT COUNT(*) FROM t"
    assert extract_sql(f"```sql\n{sql}\n```") == sql
    assert extract_sql(f"Use a CTE: {sql}") == sql
    recursive = "WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 3) SELECT x FROM n"
    assert extract_sql(f"With recursion: {recursive}") == recursive


def test_extract_sql_ignores_the_word_with_in_prose():
    reply = "Here is the query with a join: SELECT s.name FROM stores s"
    assert extract_sql(reply) == "SELECT s.name FROM stores s"


def test_verify_good_query(shop_db):
    ok, why = verify_sql(shop_db, "```sql\nSELECT name FROM stores\n```")
    assert ok
    assert why == "6 row(s)"


def test_verify_sql_error(shop_db):
    ok, why = verify_sql(shop_db, "SELECT * FROM no_such_table")
    assert not ok
    assert why.startswith("SQL error:")
    assert "no_such_table" in why


def test_verify_empty_result(shop_db):
    ok, why = verify_sql(shop_db, "SELECT * FROM stores WHERE name = 'Nowhere'")
    assert (ok, why) == (False, "empty result")


def test_verify_no_sql(shop_db):
    assert verify_sql(shop_db, "") == (False, "no SQL found")


def test_verify_cannot_write(shop_db):
    ok, why = verify_sql(shop_db, "DELETE FROM stores")
    assert not ok
    assert "readonly" in why.replace(" ", "").lower()
    assert verify_sql(shop_db, "SELECT * FROM stores")[0], "the table must be untouched"


def test_preview_sql_shows_columns_and_first_rows(shop_db):
    preview = preview_sql(shop_db, "```sql\nSELECT id, name FROM stores ORDER BY id\n```", n=2)
    assert preview["sql"] == "SELECT id, name FROM stores ORDER BY id"
    assert preview["result_columns"] == ["id", "name"]
    assert preview["result_rows"] == [(1, "Andheri West"), (2, "Bandra Linking Road")]


def test_preview_sql_reports_errors(shop_db):
    preview = preview_sql(shop_db, "SELECT nope FROM stores")
    assert "error" in preview
    assert "result_rows" not in preview
