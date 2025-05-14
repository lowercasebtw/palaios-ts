import Types, { WritableBuffer } from "../../util/byte.ts";
import Item from "./Item.ts";

export default class ItemStack {
	private readonly item: Item;
	private readonly stack_size: number;
	private readonly damage: number;

	constructor(item: Item, stack_size: number = 1, damage = 0) {
		this.stack_size = stack_size;
		this.item = item;
		this.damage = damage;
	}

	getItem() {
		return this.item;
	}

	getStackSize() {
		return this.stack_size;
	}

	getDamage() {
		return this.damage;
	}

	getMaxStackSize() {
		return this.item.getMaxStackSize();
	}

	bytes() {
		const writer = new WritableBuffer();
		Types.SHORT.write(writer, this.item.id);
		Types.BYTE.write(writer, this.stack_size);
		Types.SHORT.write(writer, this.damage);
		return writer.build();
	}
}
