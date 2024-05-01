import { ByteUtil } from './byte.ts';
import { APIUser } from './types.ts';
import * as pako from "https://deno.land/x/pako@v2.0.3/pako.js";

// TODO: this was bad, only written for testing
export function un_spaceify(str: string) {
    return [...ByteUtil.as_bytes(str)].filter(c => c != 0).map(c => String.fromCharCode(c)).join('')
}

export async function fetchUUID(username: string): Promise<string | null> {
    username = un_spaceify(username);
    const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    if (response.status == 200) {
        try {
            const data: APIUser = await response.json();
            if ('id' in data)
                return data.id;
        } catch(e) {
            // do nothing
        }
    }
    return null;
}

export function as_hex(bytes: number[]) {
	return bytes.map((byte) => (byte & 0xff).toString(16)).join("").toUpperCase();
}

export function is_gzip_compressed(bytes: Uint8Array) {
	try {
		pako.ungzip(bytes);
		return true;
	} catch (_error: unknown) {
		return false;
	}
}

export function decompress(bytes: Uint8Array): Uint8Array {
	return is_gzip_compressed(bytes) ? pako.ungzip(bytes) as Uint8Array : bytes;
}