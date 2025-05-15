import { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class ChatMessagePacket extends AbstractPacket {
	constructor(private message: string) {
		super();
	}

	override write(writer: WritableBuffer) {
		this.writePacketString(writer, this.message);
	}

	override read(reader: ReadableBuffer) {
		this.message = this.readPacketString(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onChatMessage(this);
	}

	override getType(): PacketType {
		return PacketType.CHAT_MESSAGE;
	}

	getMessage() {
		return this.message;
	}
}
