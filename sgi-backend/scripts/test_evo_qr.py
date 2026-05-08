"""Crea instancia y espera 20s para ver si genera QR."""
import asyncio
import httpx
import json

EVO_URL = "http://localhost:8080"
EVO_KEY = "sgi_evo_dev_key_2026"


async def main():
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Crear instancia
        print("=== Creando instancia test_qr2 ===")
        r = await client.post(
            f"{EVO_URL}/instance/create",
            headers={"apikey": EVO_KEY, "Content-Type": "application/json"},
            json={
                "instanceName": "test_qr2",
                "integration": "WHATSAPP-BAILEYS",
                "qrcode": True,
            },
        )
        print(f"Create: {r.status_code}")

        # Esperar 5, 10, 15, 20 seg y probar connect cada vez
        for wait in [5, 5, 5, 5]:
            print(f"\n--- Esperando {wait}s... ---")
            await asyncio.sleep(wait)
            r2 = await client.get(
                f"{EVO_URL}/instance/connect/test_qr2",
                headers={"apikey": EVO_KEY},
            )
            d = r2.json()
            has_qr = bool(d.get("base64"))
            print(f"Connect: keys={list(d.keys())}, has_base64={has_qr}")
            if has_qr:
                print(f"QR base64 length: {len(d['base64'])}")
                print("QR ENCONTRADO!")
                break

        # Check estado
        r3 = await client.get(
            f"{EVO_URL}/instance/connectionState/test_qr2",
            headers={"apikey": EVO_KEY},
        )
        print(f"\nEstado final: {r3.json()}")

        # NO eliminar, dejamos viva para ver webhooks
        print("\nInstancia test_qr2 dejada viva para diagnóstico.")


asyncio.run(main())
