from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any


@dataclass
class ProviderConfig:
    provider: str
    model: str
    api_key: str | None = None


class AIProvider:
    def __init__(self, config: ProviderConfig):
        self.config = config

    def generate(self, prompt: str, *, context: list[str] | None = None) -> str:
        if self.config.provider == 'mock':
            if context:
                return 'This response is generated from the available uploaded records and does not constitute diagnosis or treatment advice.'
            return 'No provider is configured for live generation. This is a local fallback response.'

        if not self.config.api_key:
            raise ValueError('MEDICARE_AI_API_KEY is required for non-mock providers.')

        raise NotImplementedError('Real provider integration is not configured yet.')


def build_provider() -> AIProvider:
    config = ProviderConfig(
        provider=os.getenv('MEDICARE_AI_PROVIDER', 'mock'),
        model=os.getenv('MEDICARE_AI_MODEL', 'mock-model'),
        api_key=os.getenv('MEDICARE_AI_API_KEY'),
    )
    return AIProvider(config)
