import { Vec3d } from "../../util/mth.ts";
import { Location, Vec2d } from "../../util/mth.ts";
import { DimensionType } from "../../util/types.ts";
import ItemStack from "../item/ItemStack.ts";
import { EntityType } from "./EntityType.ts";

// TODO
export class Entity {
    private static LAST_ENTITY_ID = 0;

    private id: number;
    private _type: EntityType;
    private _on_ground: boolean;

    private _inventory: Map<number, ItemStack>;
    private _location: Location;

    public constructor(type: EntityType) {
        this.id = Entity.LAST_ENTITY_ID++;
        this._type = type;
        this._on_ground = true;
        this._inventory = new Map;
        this._location = new Location(DimensionType.OVERWORLD, new Vec3d(0, 64, 0), 0, 0);
    }

    getId() { return this.id; }

    getType() { return this._type; }

    getInventory() { return this._inventory; }
    
    getLocation() { return this._location; }

    setLocation(location: Location, on_ground: boolean = true) {
        this._location = location;
        this._on_ground = on_ground;
    }
}