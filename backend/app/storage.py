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


class InMemoryDocumentStore:
    def __init__(self, base_dir: str | Path):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.documents: dict[str, DocumentRecord] = {}
        self.index: dict[str, list[str]] = {}

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
    return InMemoryDocumentStore(base_dir)
