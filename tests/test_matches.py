"""Benchmark grading: bench.run_eval.matches compares a predicted result set with the gold one."""

from bench.run_eval import matches


def test_exact_match():
    assert matches([(1, "a"), (2, "b")], [(1, "a"), (2, "b")])


def test_row_order_does_not_matter():
    assert matches([(2, "b"), (1, "a")], [(1, "a"), (2, "b")])


def test_extra_column_is_accepted_for_single_column_gold():
    pred = [("Dadar TT", 51234.0), ("Thane Station", 40100.0)]
    gold = [("Thane Station",), ("Dadar TT",)]
    assert matches(pred, gold)


def test_extra_column_needs_the_same_number_of_rows():
    assert not matches([("Dadar TT", 1.0), ("Thane Station", 2.0)], [("Dadar TT",)])


def test_extra_column_only_for_single_column_gold():
    assert not matches([(1, "a", "x")], [(1, "a")])


def test_floats_are_compared_to_two_decimals():
    assert matches([(123.4567,)], [(123.46,)])
    assert matches([(10.001,)], [(10.0,)])
    assert not matches([(10.01,)], [(10.0,)])


def test_numeric_strings_match_integers():
    # strftime('%m', ...) returns '03'; a query using CAST(... AS INT) returns 3
    assert matches([(3,)], [("03",)])


def test_mismatch():
    assert not matches([(1,)], [(2,)])
    assert not matches([("Dadar TT",)], [("Thane Station",)])


def test_empty_prediction_does_not_match():
    assert not matches([], [(1,)])
    assert matches([], [])
