import { DimensionType, WorldType } from "../../util/types.ts";
import Chunk from "./Chunk.ts";

export default class World {
    private _chunks: Chunk[];

    private file_name: string;
    private dimension: DimensionType;
    private type: WorldType;

    public constructor(file_name: string, dimension_type = DimensionType.OVERWORLD, world_type = WorldType.DEFAULT) {
        this._chunks = [];
        this.file_name = file_name;
        this.dimension = dimension_type;
        this.type = world_type;
        this.load();
    }

    private load() {
        try {
            // TODO: load from files
        } catch(e) {
            // load a new world, or crash
        }
    }

    getDimensionType() { return this.dimension; }
    
    getWorldType() { return this.type; }

    getChunkAt(x: number, z: number): Chunk | null { 
        return this._chunks[z * 128 + x] ?? null; 
    }
}