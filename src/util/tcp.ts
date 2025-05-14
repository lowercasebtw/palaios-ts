type Callback = (...data: any[]) => void;

// TCP Mini-library written by me lowercasebtw

class EventEmitter {
	private readonly listeners: Map<string, Callback[]>;

	constructor() {
		this.listeners = new Map();
	}

	on(name: string, method: Callback) {
		if (!this.listeners.has(name)) {
			this.listeners.set(name, []);
		}

		this.listeners.get(name)!.push(method);
	}

	protected emit(name: string, ...data: any[]) {
		if (this.listeners.has(name)) {
			for (const listener of this.listeners.get(name)!) {
				listener(...data);
			}
		}
	}
}

export class Server extends EventEmitter {
	private listener?: Deno.TcpListener;

	constructor(public readonly address: string, public readonly port: number) {
		super();
	}

	async listen() {
		if (this.listener !== undefined) {
			throw new Error("Already listening  on port " + this.port);
		}

		this.listener = Deno.listen({
			hostname: this.address,
			port: this.port,
			transport: "tcp",
		});

		this.emit("listen", undefined);
		for await (const connection of this.listener) {
			try {
				const client = new Client(connection);
				this.emit("connect", client);
				// Don't await, so that other clients can connect
				(async () => {
					try {
						await client.listenForData();
					} catch (error) {
						this.emit("error", error);
					}
				})();
			} catch (error) {
				this.emit("error", error);
			}
		}

		this.listener.close();
		this.emit("close", undefined);
	}
}

export class Packet {
	constructor(public readonly data: Uint8Array) {
	}
}

export class Client extends EventEmitter {
	private static readonly TOTAL_BYTES_CAPACITY = 1024; // TODO: Might have to make higher idk
	private closed: boolean;

	constructor(private readonly connection: Deno.TcpConn) {
		super();
		this.closed = false;
	}

	async listenForData() {
		const buffer = new Uint8Array(Client.TOTAL_BYTES_CAPACITY);
		while (!this.closed) {
			try {
				const length = await this.connection.read(buffer);
				if (length === null) {
					this.close("Connection closed by peer");
					break;
				} else {
					this.emit(
						"receive",
						length,
						new Packet(buffer.slice(0, length)),
					);
				}
			} catch (error) {
				this.emit("error", error);
				this.close((error as Error).message);
				break;
			}
		}
	}

	close(reason: string = "Unknown") {
		if (!this.closed) {
			this.emit("close", reason);
			this.connection.close();
			this.closed = true;
		}
	}

	isClosed() {
		return this.closed;
	}

	async write(data: Uint8Array) {
		try {
			if (this.closed) {
				throw new Error("Cannot write when connection is closed!");
			} else {
				return await this.connection.write(data);
			}
		} catch (error) {
			this.emit("error", error);
			this.close((error as Error).message);
			throw error;
		}
	}
}
