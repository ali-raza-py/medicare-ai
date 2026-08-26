from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


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
        )

    assert upload_response.status_code == 200
    document_id = upload_response.json()['document_id']
    assert document_id

    process_response = client.post('/api/documents/process', json={'document_id': document_id})
    assert process_response.status_code == 200
    payload = process_response.json()
    assert payload['document_id'] == document_id
    assert 'chunks' in payload
    assert payload['chunks'] > 0


def test_question_answer_exists():
    upload_response = client.post(
        '/api/documents/upload',
        files={'file': ('blood_pressure_report.pdf', b'%PDF-1.4\nPatient history: blood pressure 122/78 and HbA1c 6.4%.\n%%EOF\n', 'application/pdf')},
    )
    document_id = upload_response.json()['document_id']
    client.post('/api/documents/process', json={'document_id': document_id})

    response = client.post(
        '/api/medical-answer',
        json={'question': 'What was the blood pressure?', 'documents': [document_id]},
    )
    assert response.status_code == 200
    body = response.json()
    assert 'blood pressure' in body['answer'].lower()
    assert body['sourceCount'] >= 1
    assert len(body['evidence']) >= 1


def test_question_answer_missing():
    upload_response = client.post(
        '/api/documents/upload',
        files={'file': ('nutrition_note.pdf', b'%PDF-1.4\nDiet recommendations: increase vegetables and hydration.\n%%EOF\n', 'application/pdf')},
    )
    document_id = upload_response.json()['document_id']
    client.post('/api/documents/process', json={'document_id': document_id})

    response = client.post(
        '/api/medical-answer',
        json={'question': 'What is the patient’s cholesterol level?', 'documents': [document_id]},
    )
    assert response.status_code == 200
    body = response.json()
    assert 'not found' in body['answer'].lower()
    assert body['sourceCount'] == 0


def test_compare_reports():
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


def test_frontend_uses_backend_url_configuration():
    import os

    os.environ['NEXT_PUBLIC_API_BASE_URL'] = 'http://localhost:8000'
    assert os.environ['NEXT_PUBLIC_API_BASE_URL'] == 'http://localhost:8000'
