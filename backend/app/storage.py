from __future__ import annotations

import json
from datetime import datetime, timezone
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class DocumentRecord:
    document_id: str
    title: str
    filename: str
    content_type: str
    text: str
    chunks: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    processed: bool = False
    created_at: str = ""
    owner: str | None = None
    owner_id: str | None = None
    # Honest processing state: 'uploaded' | 'processing' | 'processed' | 'failed'
    status: str = "uploaded"
    error_message: str | None = None


@dataclass
class HospitalPermissionRecord:
    patient_email: str
    hospital_email: str
    status: str = 'ACTIVE'
    granted_at: str = ''


class InMemoryPermissionStore:
    def __init__(self, base_dir: str | Path):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.permissions: dict[str, HospitalPermissionRecord] = {}
        self._load_existing()

    def _load_existing(self) -> None:
        path = self.base_dir / 'hospital_permissions.json'
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            return
        if not isinstance(data, list):
            return
        for item in data:
            if not isinstance(item, dict):
                continue
            patient_email = str(item.get('patient_email') or '').strip().lower()
            hospital_email = str(item.get('hospital_email') or '').strip().lower()
            if not patient_email or not hospital_email:
                continue
            status = str(item.get('status') or 'ACTIVE').upper()
            if status not in {'ACTIVE', 'REVOKED'}:
                status = 'ACTIVE'
            key = f'{patient_email}::{hospital_email}'
            self.permissions[key] = HospitalPermissionRecord(
                patient_email=patient_email,
                hospital_email=hospital_email,
                status=status,
                granted_at=str(item.get('granted_at') or ''),
            )

    def _persist(self) -> None:
        path = self.base_dir / 'hospital_permissions.json'
        items = [
            {
                'patient_email': record.patient_email,
                'hospital_email': record.hospital_email,
                'status': record.status,
                'granted_at': record.granted_at,
            }
            for record in sorted(self.permissions.values(), key=lambda item: (item.patient_email, item.hospital_email))
        ]
        path.write_text(json.dumps(items, ensure_ascii=False), encoding='utf-8')

    def get(self, patient_email: str, hospital_email: str) -> HospitalPermissionRecord | None:
        key = f'{str(patient_email).strip().lower()}::{str(hospital_email).strip().lower()}'
        return self.permissions.get(key)

    def list_patient_permissions(self, patient_email: str) -> list[HospitalPermissionRecord]:
        target = str(patient_email).strip().lower()
        return [
            record for record in self.permissions.values()
            if record.patient_email == target
        ]

    def list_hospital_permissions(self, hospital_email: str, active_only: bool = False) -> list[HospitalPermissionRecord]:
        target = str(hospital_email).strip().lower()
        records = [
            record for record in self.permissions.values()
            if record.hospital_email == target
        ]
        if active_only:
            return [record for record in records if record.status == 'ACTIVE']
        return records

    def grant(self, patient_email: str, hospital_email: str) -> HospitalPermissionRecord:
        patient = str(patient_email).strip().lower()
        hospital = str(hospital_email).strip().lower()
        key = f'{patient}::{hospital}'
        existing = self.permissions.get(key)
        if existing is not None:
            existing.status = 'ACTIVE'
            if not existing.granted_at:
                existing.granted_at = datetime.now(timezone.utc).isoformat()
            self._persist()
            return existing
        record = HospitalPermissionRecord(
            patient_email=patient,
            hospital_email=hospital,
            status='ACTIVE',
            granted_at=datetime.now(timezone.utc).isoformat(),
        )
        self.permissions[key] = record
        self._persist()
        return record

    def revoke(self, patient_email: str, hospital_email: str) -> HospitalPermissionRecord | None:
        patient = str(patient_email).strip().lower()
        hospital = str(hospital_email).strip().lower()
        key = f'{patient}::{hospital}'
        record = self.permissions.get(key)
        if record is None:
            return None
        record.status = 'REVOKED'
        self._persist()
        return record

    def has_active_permission(self, patient_email: str, hospital_email: str) -> bool:
        record = self.get(patient_email, hospital_email)
        return record is not None and record.status == 'ACTIVE'


def build_permission_store(base_dir: str | Path = './.uploads') -> InMemoryPermissionStore:
    return InMemoryPermissionStore(base_dir)


class InMemoryDocumentStore:
    def __init__(self, base_dir: str | Path):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.documents: dict[str, DocumentRecord] = {}
        self.index: dict[str, list[str]] = {}
        self._load_existing()

    def _load_existing(self) -> None:
        """Load previously persisted document JSON files from disk on startup."""
        for path in sorted(self.base_dir.glob("*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            if not isinstance(data, dict):
                continue
            try:
                document = DocumentRecord(
                    document_id=str(data.get("document_id") or ""),
                    title=str(data.get("title") or ""),
                    filename=str(data.get("filename") or ""),
                    content_type=str(data.get("content_type") or "application/octet-stream"),
                    text=str(data.get("text") or ""),
                    chunks=list(data.get("chunks") or []),
                    metadata=dict(data.get("metadata") or {}),
                    processed=bool(data.get("processed", False)),
                    created_at=str(data.get("created_at") or ""),
                    owner=data.get("owner"),
                    owner_id=data.get("owner_id"),
                    status=str(data.get("status") or ("processed" if data.get("processed") else "uploaded")),
                    error_message=data.get("error_message"),
                )
            except (TypeError, ValueError):
                continue
            if not document.document_id:
                continue
            self.documents[document.document_id] = document

    def _load_persisted(self) -> int:
        """Reload document JSON files written to base_dir on startup.
        Returns the number of documents successfully restored."""
        count = 0
        for json_file in self.base_dir.glob('*.json'):
            if json_file.name == 'hospital_permissions.json':
                continue
            try:
                data = json.loads(json_file.read_text(encoding='utf-8'))
                if not isinstance(data, dict):
                    continue
                if not data.get('document_id'):
                    continue
                doc = DocumentRecord(
                    document_id=data['document_id'],
                    title=data['title'],
                    filename=data['filename'],
                    content_type=data.get('content_type', 'application/octet-stream'),
                    text=data.get('text', ''),
                    chunks=data.get('chunks', []),
                    metadata=data.get('metadata', {}),
                    processed=data.get('processed', False),
                    created_at=data.get('created_at', ''),
                    # Restore ownership so /api/timeline and the document
                    # endpoints keep filtering by the authenticated user's
                    # email after a backend restart.
                    owner=data.get("owner"),
                    owner_id=data.get("owner_id"),
                    status=str(data.get('status') or ('processed' if data.get('processed') else 'uploaded')),
                    error_message=data.get('error_message'),
                )
                self.documents[doc.document_id] = doc
                count += 1
            except (json.JSONDecodeError, KeyError, OSError, TypeError, ValueError):
                # Skip corrupted or incomplete files
                continue
        return count

    def add(self, document: DocumentRecord) -> None:
        self.documents[document.document_id] = document
        self.base_dir.joinpath(f"{document.document_id}.json").write_text(json.dumps({
            'document_id': document.document_id,
            'title': document.title,
            'filename': document.filename,
            'content_type': document.content_type,
            'text': document.text,
            'chunks': document.chunks,
            'metadata': document.metadata,
            'processed': document.processed,
            'created_at': document.created_at,
            'owner': document.owner,
            'owner_id': document.owner_id,
            'status': document.status,
            'error_message': document.error_message,
        }, ensure_ascii=False), encoding='utf-8')

    def get(self, document_id: str) -> DocumentRecord | None:
        return self.documents.get(document_id)

    def list(self) -> list[DocumentRecord]:
        return list(self.documents.values())

    def update(self, document_id: str, **kwargs: Any) -> None:
        document = self.documents[document_id]
        for key, value in kwargs.items():
            setattr(document, key, value)
        self.add(document)

    def delete(self, document_id: str) -> None:
        self.documents.pop(document_id, None)
        self.index.pop(document_id, None)
        try:
            self.base_dir.joinpath(f"{document_id}.json").unlink()
        except FileNotFoundError:
            pass


def build_document_store(base_dir: str | Path = './.uploads') -> InMemoryDocumentStore:
    store = InMemoryDocumentStore(base_dir)
    store._load_persisted()
    return store
