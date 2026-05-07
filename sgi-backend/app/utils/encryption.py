"""
Utilidad de encriptación simétrica para valores sensibles.
Usa Fernet (AES-128-CBC) con una clave derivada del SECRET_KEY de la app.
"""
import base64
import hashlib
from cryptography.fernet import Fernet


def _get_fernet_key(secret_key: str) -> bytes:
    """Deriva una clave Fernet válida (32 bytes base64) desde el SECRET_KEY."""
    # SHA-256 produce 32 bytes, Fernet necesita 32 bytes url-safe base64
    digest = hashlib.sha256(secret_key.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_value(plain_text: str, secret_key: str) -> str:
    """Encripta un valor de texto plano. Retorna el string encriptado."""
    if not plain_text:
        return plain_text
    fernet = Fernet(_get_fernet_key(secret_key))
    return fernet.encrypt(plain_text.encode()).decode()


def decrypt_value(encrypted_text: str, secret_key: str) -> str:
    """Desencripta un valor. Retorna el texto plano."""
    if not encrypted_text:
        return encrypted_text
    try:
        fernet = Fernet(_get_fernet_key(secret_key))
        return fernet.decrypt(encrypted_text.encode()).decode()
    except Exception:
        # Si no se puede desencriptar (valor legacy sin encriptar), retornar tal cual
        return encrypted_text


def mask_value(value: str) -> str:
    """Enmascara un valor sensible para mostrar en respuestas de API."""
    if not value:
        return "****"
    if len(value) <= 4:
        return "****"
    return "*" * (len(value) - 4) + value[-4:]
