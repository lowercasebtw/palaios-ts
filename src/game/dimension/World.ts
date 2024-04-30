import { Entity } from "../entity/Entity.ts";
import Chunk from "./Chunk.ts";
import { DimensionType, WorldType } from "./DimensionType.ts";

export default class World {
    private chunks: Chunk[];
    private entities: Entity[];

    private file_name: string;
    private dimension: DimensionType;
    private type: WorldType;

    public constructor(file_name: string, dimension_type = DimensionType.OVERWORLD, world_type = WorldType.DEFAULT) {
        this.chunks = [];
        this.entities = [];
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

    getEntities() { return this.entities; }

    getDimensionType() { return this.dimension; }
    
    getWorldType() { return this.type; }

    getChunkAt(x: number, z: number): Chunk | null { 
        return this.chunks[z * 128 + x] ?? null; 
    }
}