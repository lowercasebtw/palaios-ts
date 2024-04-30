export function generateHash() {
    let hash = '';
    for (let i = 0; i < 16; i++)
        hash += Math.floor(Math.random() * 16).toString(16);
    return hash;
}

export function generateStringHash(str: string) {
    let hash = 0;
    if (str.length == 0) 
        return hash;
    let char;
    for (let i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}