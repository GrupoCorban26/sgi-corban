from passlib.context import CryptContext
import sys

# Configuración idéntica a app/core/security.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def main():
    print("--- Generador de Hash de Contraseñas (Bcrypt) ---")
    
    if len(sys.argv) > 1:
        # Si se pasa argumento por línea de comandos
        password = sys.argv[1]
        print(f"Password: {password}")
        print(f"Hash: {pwd_context.hash(password)}")
        return

    # Modo interactivo
    while True:
        try:
            password = input("\nIngresa la contraseña (o 'q' para salir): ")
            if password.lower() == 'q' or not password:
                break
            
            hashed = pwd_context.hash(password)
            print("-" * 60)
            print(f"Contraseña: {password}")
            print(f"Hash:       {hashed}")
            print("-" * 60)
        except KeyboardInterrupt:
            break
    
    print("\nSaliendo...")

if __name__ == "__main__":
    main()
