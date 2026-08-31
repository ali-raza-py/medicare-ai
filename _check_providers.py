"""Check which AI provider SDKs are installed."""
try:
    import groq
    print(f"groq version: {groq.__version__}")
except ImportError:
    print("groq: NOT INSTALLED")

try:
    from google import genai
    print("google-genai: INSTALLED")
except ImportError:
    print("google-genai: NOT INSTALLED")

try:
    import google.generativeai
    print("google-generativeai: INSTALLED")
except ImportError:
    print("google-generativeai: NOT INSTALLED")
