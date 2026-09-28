import pytest
from fastapi import HTTPException
from rig.catalog import DOCS, validate_docs

def test_44_docs():
    assert len(DOCS) == 44

def test_category_counts():
    from collections import Counter
    c = Counter(d["cat"] for d in DOCS)
    assert c == {"overview": 6, "planning": 7, "operations": 12,
                 "data": 8, "business": 4, "marketing": 7}

def test_unknown_id_rejected():
    with pytest.raises(HTTPException) as e:
        validate_docs(["nope"])
    assert e.value.status_code == 422

def test_valid_id_returns_doc():
    out = validate_docs(["charter"])
    assert out[0]["name"] == "Project Charter"
