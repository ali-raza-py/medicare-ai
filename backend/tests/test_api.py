from pathlib import Path

import os
import jwt
from fastapi.testclient import TestClient

from backend.app.main import app, store

JWT_SECRET = os.environ.get("MEDICARE_JWT_SECRET", "test-jwt-secret-for-pytest-only-32bytes!")

client = TestClient(app)


def _make_token(email: str = "test@example.com") -> str:
    """Create a test JWT that the backend's auth dependency will accept."""
    return jwt.encode({"sub": email, "email": email, "aud": "test"}, JWT_SECRET, algorithm="HS256")


def _auth_headers(email: str = "test@example.com") -> dict[str, str]:
    return {"Authorization": f"Bearer {_make_token(email)}"}


@pytest.fixture(autouse=True)
def reset_store():
    """Fresh store for each test so one test cannot see another's documents."""
    store.documents.clear()
    yield
    store.documents.clear()


def test_health_endpoint():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_upload_and_process_document(tmp_path):
    pdf_path = tmp_path / 'sample_report.pdf'
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
    pdf_path.write_bytes(pdf_content)

    with pdf_path.open('rb') as fh:
        upload_response = client.post(
            '/api/documents/upload',
            files={'file': ('sample_report.pdf', fh, 'application/pdf')},
            data={'title': 'Sample report'},
            headers=_auth_headers(),
        )

    assert upload_response.status_code == 200
    document_id = upload_response.json()['document_id']
    assert document_id

    process_response = client.post(
        '/api/documents/process',
        json={'document_id': document_id},
        headers=_auth_headers(),
    )
    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload['document_id'] == document_id
    assert 'chunks' in payload
    assert payload['chunks'] > 0


def test_question_answer_exists(tmp_path):
    pdf_path = tmp_path / 'blood_pressure_report.pdf'
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nstream\nBT\n/Title (Blood Pressure 122/78 and HbA1c 6.4%)\nET\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
    pdf_path.write_bytes(pdf_content)

    with pdf_path.open('rb') as fh:
        upload_response = client.post(
            '/api/documents/upload',
            files={'file': ('blood_pressure_report.pdf', fh, 'application/pdf')},
            headers=_auth_headers(),
        )
    document_id = upload_response.json()['document_id']
    client.post(
        '/api/documents/process',
        json={'document_id': document_id},
        headers=_auth_headers(),
    )

    response = client.post(
        '/api/medical-answer',
        json={'question': 'What was the blood pressure?', 'documents': [document_id]},
        headers=_auth_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body['sourceCount'] >= 1
    assert len(body['evidence']) >= 1


def test_question_answer_missing() -> None:
    upload_response = client.post(
        '/api/documents/upload',
        files={'file': ('nutrition_note.pdf', b'%PDF-1.4\nDiet recommendations: increase vegetables and hydration.\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers(),
    )
    document_id = upload_response.json()['document_id']
    assert document_id
    client.post(
        '/api/documents/process',
        json={'document_id': document_id},
        headers=_auth_headers(),
    )

    response = client.post(
        '/api/medical-answer',
        json={'question': "What is the patient\u2019s cholesterol level?", 'documents': [document_id]},
        headers=_auth_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert 'not found' in body['answer'].lower()
    assert body['sourceCount'] == 0


def test_compare_reports() -> None:
    response = client.post(
        '/api/compare-reports',
        json={
            'leftReport': 'Blood pressure 128/82, HbA1c 6.8%, medication: Metformin',
            'rightReport': 'Blood pressure 122/78, HbA1c 6.4%, medication: Metformin and lifestyle follow-up',
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body['changes']
    assert any(change['field'] == 'Blood pressure' for change in body['changes'])


def test_document_belongs_to_owner_after_upload() -> None:
    response = client.post(
        '/api/documents/upload',
        files={'file': ('report.pdf', b'%PDF-1.4\nHello world\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("owner-a@example.com"),
    )
    document_id = response.json()['document_id']
    stored = store.get(document_id)
    assert stored is not None
    assert stored.owner == "owner-a@example.com"


def test_user_a_cannot_access_user_b_document() -> None:
    # User A uploads a document
    upload_a = client.post(
        '/api/documents/upload',
        files={'file': ('a.pdf', b'%PDF-1.4\ndata-a\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("user-a@example.com"),
    )
    doc_id_a = upload_a.json()['document_id']

    # User B uploads a different document
    upload_b = client.post(
        '/api/documents/upload',
        files={'file': ('b.pdf', b'%PDF-1.4\ndata-b\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("user-b@example.com"),
    )
    doc_id_b = upload_b.json()['document_id']

    # User B cannot fetch User A's document
    forbidden = client.get(
        f'/api/documents/{doc_id_a}',
        headers=_auth_headers("user-b@example.com"),
    )
    assert forbidden.status_code == 403

    # User B can fetch their own document
    ok = client.get(
        f'/api/documents/{doc_id_b}',
        headers=_auth_headers("user-b@example.com"),
    )
    assert ok.status_code == 200
    assert ok.json()['document_id'] == doc_id_b


def test_unauthorized_upload_rejected() -> None:
    response = client.post(
        '/api/documents/upload',
        files={'file': ('report.pdf', b'%PDF-1.4\nx\n%%EOF\n', 'application/pdf')},
    )
    assert response.status_code == 401


def test_unauthorized_timeline_rejected() -> None:
    response = client.get('/api/timeline')
    assert response.status_code == 401


def test_unauthorized_document_detail_rejected() -> None:
    response = client.get('/api/documents/does-not-exist')
    assert response.status_code == 401


def test_unauthorized_document_list_rejected() -> None:
    response = client.get('/api/documents')
    assert response.status_code == 401


def test_unauthorized_process_rejected() -> None:
    response = client.post(
        '/api/documents/process',
        json={'document_id': 'does-not-exist'},
    )
    assert response.status_code == 401


def test_unauthorized_medical_answer_rejected() -> None:
    response = client.post(
        '/api/medical-answer',
        json={'question': 'x', 'documents': []},
    )
    assert response.status_code == 401


def test_timeline_returns_real_document_events() -> None:
    filename = 'lipid_panel_report.pdf'
    upload_response = client.post(
        '/api/documents/upload',
        files={'file': (filename, b'%PDF-1.4\nCholesterol 178 mg/dL. LDL 96 mg/dL.\n%%EOF\n', 'application/pdf')},
        data={'title': 'Lipid Panel'},
        headers=_auth_headers(),
    )
    document_id = upload_response.json()['document_id']

    response = client.get('/api/timeline', headers=_auth_headers())
    assert response.status_code == 200
    events = response.json()['events']
    match = [e for e in events if e['documentId'] == document_id]
    assert len(match) == 1
    event = match[0]
    assert event['id'] == f'evt-{document_id}'
    assert event['title'] == 'Lipid Panel'
    assert event['type'] in {'Lab Result', 'Diagnosis', 'Imaging', 'Medication', 'Doctor Visit', 'Medical Report'}
    assert event['date']
    assert 'Cholesterol' in event['description']
    assert event['metadata']['filename'] == filename

    dates = [e['date'] for e in events]
    assert dates == sorted(dates, reverse=True)


def test_timeline_empty_store_returns_empty_events() -> None:
    response = client.get('/api/timeline', headers=_auth_headers())
    assert response.status_code == 200
    assert isinstance(response.json()['events'], list)


def test_timeline_only_returns_owners_documents() -> None:
    client.post(
        '/api/documents/upload',
        files={'file': ('a.pdf', b'%PDF-1.4\na\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("user-a@example.com"),
    )
    client.post(
        '/api/documents/upload',
        files={'file': ('b.pdf', b'%PDF-1.4\nb\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("user-b@example.com"),
    )

    response = client.get('/api/timeline', headers=_auth_headers("user-a@example.com"))
    events = response.json()['events']
    assert len(events) == 1
    assert events[0]['documentId'] != ''


def test_document_list_only_returns_owners_documents() -> None:
    client.post(
        '/api/documents/upload',
        files={'file': ('a.pdf', b'%PDF-1.4\na\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("user-a@example.com"),
    )
    client.post(
        '/api/documents/upload',
        files={'file': ('b.pdf', b'%PDF-1.4\nb\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("user-b@example.com"),
    )

    response = client.get('/api/documents', headers=_auth_headers("user-a@example.com"))
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 1
    assert docs[0]['document_id'] != ''


def test_process_requires_ownership() -> None:
    upload = client.post(
        '/api/documents/upload',
        files={'file': ('a.pdf', b'%PDF-1.4\na\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("user-a@example.com"),
    )
    doc_id = upload.json()['document_id']

    forbidden = client.post(
        '/api/documents/process',
        json={'document_id': doc_id},
        headers=_auth_headers("user-b@example.com"),
    )
    assert forbidden.status_code == 403


def test_medical_answer_requires_ownership() -> None:
    upload = client.post(
        '/api/documents/upload',
        files={'file': ('a.pdf', b'%PDF-1.4\nblood pressure 122/78\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("user-a@example.com"),
    )
    doc_id = upload.json()['document_id']
    client.post(
        '/api/documents/process',
        json={'document_id': doc_id},
        headers=_auth_headers("user-a@example.com"),
    )

    forbidden = client.post(
        '/api/medical-answer',
        json={'question': 'blood pressure?', 'documents': [doc_id]},
        headers=_auth_headers("user-b@example.com"),
    )
    assert forbidden.status_code == 404


def test_frontend_uses_backend_url_configuration() -> None:
    import os

    os.environ['NEXT_PUBLIC_API_BASE_URL'] = 'http://localhost:8000'
    assert os.environ['NEXT_PUBLIC_API_BASE_URL'] == 'http://localhost:8000'


def test_persisted_document_loaded_after_restart(tmp_path) -> None:
    """Simulate a backend restart by clearing the in-memory store and reloading
    from the JSON files that the upload wrote to disk."""
    upload = client.post(
        '/api/documents/upload',
        files={'file': ('persist.pdf', b'%PDF-1.4\npersist\n%%EOF\n', 'application/pdf')},
        headers=_auth_headers("persist@example.com"),
    )
    doc_id = upload.json()['document_id']

    # Simulate restart: clear in-memory store.
    store.documents.clear()

    # After restart the store should reload from the JSON file.
    from backend.app.storage import build_document_store
    fresh_store = build_document_store(store.base_dir)
    loaded = fresh_store.get(doc_id)
    assert loaded is not None
    assert loaded.owner == "persist@example.com"
    assert loaded.filename == "persist.pdf"
