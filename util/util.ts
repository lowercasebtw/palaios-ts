import { ByteUtil } from './byte.ts';
import { APIUser } from './types.ts';

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