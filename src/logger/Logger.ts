export enum Level {
    INFO = "INFO",
    WARNING = "WARNING",
    SEVERE = "SEVERE",
    FATAL = "FATAL"
}

export const Logger = new (class Logger {
    private getPrefix(level: Level) {
        const date: Date = new Date;
        return `${date.getHours().toString().padEnd(2, '0')}:${date.getMinutes().toString().padEnd(2, '0')}:${date.getSeconds().toString().padEnd(2, '0')} [${level}] `;
    }

    log(level: Level, message: any, ...args: any[]) {
        let out: Console['log'];
        let color: string;

        // TODO: implement ...args formatting

        switch (level) {
            case Level.INFO: {
                out = console.log;
                color = "white";
            } break;
            case Level.WARNING: {
                out = console.warn;
                color = "yellow";
            } break;
            case Level.SEVERE: {
                out = console.error;
                color = "orange";
            } break;
            case Level.FATAL: {
                out = console.error;
                color = "red";
            } break;
        }

        switch (typeof message) {
            case "number":
            case "bigint":
            case "string":
            case "boolean":
            case "symbol":
            case "undefined": {
                out("%c" + this.getPrefix(level) + (message || "").toString(), "color: " + color + ";");
            } break;

            case "object": {
                // TODO
                if (Array.isArray(message) || message instanceof Uint8Array) {
                    // ARRAY
                    console.log(message);
                } 
            } break;

            case "function": {
                // TODO
            } break;

            default: throw new Error(this.getPrefix(level) + "Unknown type to log");
        }

        if (level === Level.FATAL)
            throw new Error("The server encountered a fatal error, causing it to crash. Please restart.");
    }
})();