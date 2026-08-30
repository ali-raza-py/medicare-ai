from __future__ import annotations

import json
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
            try:
                data = json.loads(json_file.read_text(encoding='utf-8'))
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
                )
                self.documents[doc.document_id] = doc
                count += 1
            except (json.JSONDecodeError, KeyError, OSError):
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


def build_document_store(base_dir: str | Path = './.uploads') -> InMemoryDocumentStore:
    store = InMemoryDocumentStore(base_dir)
    store._load_persisted()
    return store
