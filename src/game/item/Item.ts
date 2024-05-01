import { NBT_Tag } from "../../nbt/nbt.ts";

export default class Item {
    private id: number;
    private data: NBT_Tag;

    public constructor(id: number, data: NBT_Tag) {
        this.id = id;
        this.data = data;
    }
}