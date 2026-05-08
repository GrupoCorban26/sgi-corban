import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as c:
        # Intentar findGroupMetadata
        r1 = await c.get('http://localhost:8080/group/findGroupMetadata/sgi_comercial_5', headers={'apikey':'sgi_evo_dev_key_2026'}, params={'groupJid':'51933485985-1631552681@g.us'})
        print("findGroupMetadata:", r1.status_code, r1.text)
        
        # Intentar findGroupInfos
        r2 = await c.get('http://localhost:8080/group/findGroupInfos/sgi_comercial_5', headers={'apikey':'sgi_evo_dev_key_2026'}, params={'groupJid':'51933485985-1631552681@g.us'})
        print("findGroupInfos:", r2.status_code, r2.text)

if __name__ == "__main__":
    asyncio.run(test())
