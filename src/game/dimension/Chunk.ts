import { Block } from "../block/Block.ts";

export default class Chunk {
    private data: Block[];
    public constructor() {
        this.data = [];
    }

    getBlockAt(x: number, y: number, z: number): Block | null { 
        // TODO
        return null;
    }
}