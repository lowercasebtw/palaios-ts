import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";
import ItemStack from "../game/item/ItemStack.ts";

export default class SetWindowItemsPacket extends AbstractPacket {
	constructor(private windowId: number, private items: ItemStack[]) {
		super();
	}

	override write(writer: WritableBuffer) {
		if (this.items.length < 44) return; // invalid
		Types.BYTE.write(writer, this.windowId);
		Types.SHORT.write(writer, this.items.length);
		for (const itemStack of this.items) {
			writer.write(...itemStack.bytes());
		}
	}

	override read(reader: ReadableBuffer) {
	}

	override async handle(handler: PacketHandler) {
		await handler.onSetWindowItems(this);
	}

	override getType(): PacketType {
		return PacketType.SET_WINDOW_ITEMS;
	}
}
