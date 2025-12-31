from passlib.context import CryptContext

# Configuración estándar que hemos estado usando
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Generamos el hash para 'admin1234'
password_plana = "mari123"
hash_generado = pwd_context.hash(password_plana)

print(f"Tu nuevo hash es: {hash_generado}")