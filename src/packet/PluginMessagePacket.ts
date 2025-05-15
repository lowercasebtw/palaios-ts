import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class PluginMessagePacket extends AbstractPacket {
	constructor(private channel: string, private message: Uint8Array) {
		super();
	}

	override write(writer: WritableBuffer) {
		this.writePacketString(writer, this.channel);
		Types.SHORT.write(writer, this.message.length);
		writer.write(...this.message);
	}

	override read(reader: ReadableBuffer) {
		this.channel = this.readPacketString(reader);
		this.message = reader.reads(Types.SHORT.read(reader));
	}

	override async handle(handler: PacketHandler) {
		await handler.onPluginMessage(this);
	}

	override getType(): PacketType {
		return PacketType.PLUGIN_MESSAGE;
	}

	getChannel() {
		return this.channel;
	}

	getMessage() {
		return this.message;
	}
}
