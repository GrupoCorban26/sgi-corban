import bcrypt

# La contraseña que quieres para Grupo Corban
password_plana = "admin1234"

# Convertimos la contraseña a bytes
password_bytes = password_plana.encode('utf-8')

# Generamos la "sal" y el hash
salt = bcrypt.gensalt()
hash_resultado = bcrypt.hashpw(password_bytes, salt)

# Imprimimos el resultado final
print("\n" + "="*50)
print("COPIA ESTE HASH PARA TU SQL SERVER:")
print("="*50)
print(hash_resultado.decode('utf-8'))
print("="*50 + "\n")