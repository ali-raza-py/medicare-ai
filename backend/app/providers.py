from __future__ import annotations

import os
from dataclasses import dataclass


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

        api_key = self.config.api_key or os.getenv('MEDICARE_AI_API_KEY')
        if not api_key:
            raise ValueError('MEDICARE_AI_API_KEY is required for non-mock providers.')

        provider_name = (self.config.provider or '').lower()
        normalized = provider_name.replace('_', '-').replace(' ', '-')

        if normalized in {'gemini', 'google', 'google-gemini'}:
            return self._generate_with_gemini(prompt, context=context, api_key=api_key)

        raise NotImplementedError(f'Real provider integration for {self.config.provider!r} is not configured yet.')

    def _generate_with_gemini(self, prompt: str, *, context: list[str] | None = None, api_key: str) -> str:
        try:
            from google import genai
        except ImportError:
            try:
                import google.generativeai as genai
            except ImportError as exc:
                raise RuntimeError('Gemini SDK is not installed. Install google-genai or google-generativeai.') from exc
            else:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(self.config.model)
                response = model.generate_content(prompt if not context else '\n\n'.join([*context, prompt]))
                return getattr(response, 'text', str(response))

        client = genai.Client(api_key=api_key)
        payload = prompt if not context else '\n\n'.join([*context, prompt])
        response = client.models.generate_content(
            model=self.config.model,
            contents=payload,
        )
        return getattr(response, 'text', str(response))


def build_provider() -> AIProvider:
    config = ProviderConfig(
        provider=os.getenv('MEDICARE_AI_PROVIDER', 'mock'),
        model=os.getenv('MEDICARE_AI_MODEL', 'mock-model'),
        api_key=os.getenv('MEDICARE_AI_API_KEY'),
    )
    return AIProvider(config)
