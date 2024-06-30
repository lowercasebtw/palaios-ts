import { existsSync } from "https://deno.land/std@0.224.0/fs/exists.ts";
import { DimensionType, WorldType } from "../../util/types.ts";
import { Block } from "../block/Block.ts";
import Chunk from "./Chunk.ts";
import { parse_nbt_file } from "../../nbt/nbt.ts";

export default class World {
    private _chunks: Chunk[];

    private world_path: string;
    private dimension: DimensionType;
    private type: WorldType;

    public constructor(world_path: string, dimension_type = DimensionType.OVERWORLD, world_type = WorldType.DEFAULT) {
        this._chunks = [];
        this.world_path = world_path;
        this.dimension = dimension_type;
        this.type = world_type;
        this.load();
    }

    private load() {
        try {
            if (!existsSync(this.world_path))
                throw new Error(); // World doesn't exist
            const level_nbt = parse_nbt_file(Deno.readFileSync(this.world_path + "/level.dat"));
            // TODO
        } catch(e) {
            console.error("Failed to load world " + DimensionType[this.dimension] + ", loading default...");
            // TODO: write the world to file
            // load a new world, or crash
            for (let z = 0; z < 8; ++z) {
                for (let x = 0; x < 8; ++x) {
                    const chunk = new Chunk(x, z);
                    // set blocks
                    this._chunks.push(chunk);
                }
            }
        }
    }

    getDimensionType() { return this.dimension; }
    
    getWorldType() { return this.type; }

    getChunkAt(x: number, z: number): Chunk | null { 
        return this._chunks[z * 128 + x] ?? null; 
    }

    getBlockAt(x: number, y: number, z: number): Block | null { 
        const chunk = this.getChunkAt(Math.floor(x/16), Math.floor(z/16));
        if (chunk == null)
            return null;
        return chunk.getBlockAt(x, y, z);
    }
}