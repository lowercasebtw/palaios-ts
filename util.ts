import { APIUser } from './types.ts';

// TODO: wont need probably in the future
// @Deprecated
export function as_bytes(bytes: string) {
    return new Uint8Array([...bytes].map(c => c.charCodeAt(0)));
}

// TODO: wont need probably in the future
// @Deprecated
export function as_string(bytes: Uint8Array, null_terminated = false) {
    let string = "";
    for (let i = null_terminated ? 3 : 0; i < bytes.length; ++i)
        string += String.fromCharCode(bytes[i]);
    return string;
}

// TODO: this was bad, only written for testing
export function un_spaceify(str: string) {
    return str.split('').map(c => c.charCodeAt(0)).filter(c => c != 0).map(c => String.fromCharCode(c)).join('')
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