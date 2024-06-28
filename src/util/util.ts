import { APIUser } from './types.ts';

export async function fetchUUID(username: string): Promise<string | null> {
    const response = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${username}`);
    if (response.status != 200) 
        return null;
    const data: APIUser = await response.json();
    return data.id ?? null;
}

export function as_hex(bytes: number[]) {
	return bytes.map((byte) => (byte & 0xff).toString(16)).join("").toUpperCase();
}