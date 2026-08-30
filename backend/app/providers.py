from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ProviderConfig:
    provider: str
    model: str
    api_key: str | None = None


# Module-level cached clients — avoids expensive re-init on every request.
_cached_gemini_client = None
_cached_gemini_api_key: str | None = None
_cached_groq_client = None
_cached_groq_api_key: str | None = None


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
            return self._generate_with_gemini(prompt, api_key=api_key)

        if normalized in {'groq'}:
            return self._generate_with_groq(prompt, api_key=api_key)

        raise NotImplementedError(f'Real provider integration for {self.config.provider!r} is not configured yet.')

    def _generate_with_gemini(self, prompt: str, *, api_key: str) -> str:
        """Call Gemini with a cached client, AFC disabled, and a timeout."""
        global _cached_gemini_client, _cached_gemini_api_key

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
                response = model.generate_content(prompt)
                return getattr(response, 'text', str(response))

        # Re-use the cached client when the API key hasn't changed.
        if _cached_gemini_client is None or _cached_gemini_api_key != api_key:
            from google.genai import types
            _cached_gemini_client = genai.Client(api_key=api_key)
            _cached_gemini_api_key = api_key
            logger.info('Gemini client initialised (cached, AFC disabled).')

        from google.genai import types
        response = _cached_gemini_client.models.generate_content(
            model=self.config.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                # Disable automatic function calling — not needed and adds latency.
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True,
                ),
            ),
        )
        return getattr(response, 'text', str(response))


    def _generate_with_groq(self, prompt: str, *, api_key: str) -> str:
        """Call Groq with a cached client (OpenAI-compatible SDK) and retry on rate limits."""
        global _cached_groq_client, _cached_groq_api_key

        try:
            from groq import Groq
        except ImportError as exc:
            raise RuntimeError('Groq SDK is not installed. Run: pip install groq') from exc

        if _cached_groq_client is None or _cached_groq_api_key != api_key:
            _cached_groq_client = Groq(api_key=api_key)
            _cached_groq_api_key = api_key
            logger.info('Groq client initialised (cached).')

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = _cached_groq_client.chat.completions.create(
                    model=self.config.model,
                    messages=[
                        {'role': 'user', 'content': prompt},
                    ],
                    temperature=0.3,
                )
                return response.choices[0].message.content
            except Exception as exc:
                exc_str = str(exc).lower()
                if 'rate' in exc_str or '429' in exc_str:
                    wait = 2 ** attempt  # 1s, 2s, 4s
                    if attempt < max_retries - 1:
                        logger.warning('Groq rate limited (attempt %d/%d), retrying in %ds...', attempt + 1, max_retries, wait)
                        time.sleep(wait)
                        continue
                raise


def build_provider() -> AIProvider:
    config = ProviderConfig(
        provider=os.getenv('MEDICARE_AI_PROVIDER', 'mock'),
        model=os.getenv('MEDICARE_AI_MODEL', 'mock-model'),
        api_key=os.getenv('MEDICARE_AI_API_KEY'),
    )
    return AIProvider(config)
