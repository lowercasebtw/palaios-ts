import { NBT_Compound } from "../../nbt/nbt.ts";

export default class Item {
    public readonly id: number;
    private data: NBT_Compound;

    public constructor(id: number, data: NBT_Compound = new NBT_Compound("tag", [])) {
        this.id = id;
        this.data = data;
    }

    getData() {
        return this.data;
    }

    getMaxStackSize() {
        return 64;
    }
}