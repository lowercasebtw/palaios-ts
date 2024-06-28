import { ByteWriter, Type } from "../../util/byte.ts";
import Item from "./Item.ts";

export default class ItemStack {
    private item: Item;
    private stack_size: number;
    private damage: number;

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
        const writer = new ByteWriter();
        writer.write(Type.SHORT, this.item.id);
        writer.write(Type.BYTE, this.stack_size);
        writer.write(Type.SHORT, this.damage);
        return writer.build(); 
    }
}