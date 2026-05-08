import asyncio
import httpx
import json

EVO_URL = "http://localhost:8080"
EVO_KEY = "sgi_evo_dev_key_2026"

async def main():
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Limpiar por si existe
        await client.delete(f"{EVO_URL}/instance/delete/test_qr_manual", headers={"apikey": EVO_KEY})
        
        print("=== Creando instancia (qrcode: false) ===")
        r = await client.post(
            f"{EVO_URL}/instance/create",
            headers={"apikey": EVO_KEY, "Content-Type": "application/json"},
            json={
                "instanceName": "test_qr_manual",
                "integration": "WHATSAPP-BAILEYS",
                "qrcode": False,
            },
        )
        print(f"Create status: {r.status_code}")
        
        await asyncio.sleep(2)
        
        print("\n=== Solicitando conexión (connect) ===")
        r2 = await client.get(
            f"{EVO_URL}/instance/connect/test_qr_manual",
            headers={"apikey": EVO_KEY},
        )
        print(f"Connect status: {r2.status_code}")
        d = r2.json()
        print(f"Keys recibidas: {list(d.keys())}")
        if d.get("base64"):
            print("¡QR RECIBIDO EN CONNECT!")
            print(d["base64"][:50] + "...")
        else:
            print("No hay base64 en la respuesta:", d)

        # Limpiar
        await client.delete(f"{EVO_URL}/instance/delete/test_qr_manual", headers={"apikey": EVO_KEY})

asyncio.run(main())
