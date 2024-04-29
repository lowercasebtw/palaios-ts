export function translateAlternativeColor(symbol: string, message: string) {
    // TODO: don't replace backslashed symbols (i.e '\&message')
    return message.replaceAll(symbol, '§');
}

export function colorMessage(message: string) {
    return translateAlternativeColor('&', message);
}