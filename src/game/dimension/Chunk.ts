import { Block } from "../block/Block.ts";

export default class Chunk {
    private blocks: Block[];
    
    public readonly x: number;
    public readonly z: number;
    
    public constructor(x: number, z: number) {
        this.blocks = [];
        this.x = x;
        this.z = z;
    }

    getBlockAt(x: number, y: number, z: number): Block | null { 
        // TODO
        throw new Error("meow");
    }

    setBlockAt(block: Block, x: number, y: number, z: number): Block | null { 
        // TODO
        throw new Error("meow");
    }

    to_bytes() {
        // TODO:
        return new Uint8Array;   
    }
}