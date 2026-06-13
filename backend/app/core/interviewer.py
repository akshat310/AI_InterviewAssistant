import google.generativeai as genai
from app.config import get_settings

settings = get_settings()

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

# gemini-2.5-flash — latest free model on your account
model = genai.GenerativeModel("gemini-2.5-flash")


def test_gemini_connection() -> str:
    """Quick test to verify Gemini is connected."""
    response = model.generate_content("Say hello as an AI interview assistant in one line.")
    return response.text


def get_gemini_model():
    """Returns the configured Gemini model."""
    return model