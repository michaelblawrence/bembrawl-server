import { Injectable } from "@nestjs/common";

export interface RoomIdGuidStore {
    [roomId: number]: string;
}

@Injectable()
export class RoomIdStateProvider {
    private readonly roomIdGameStore: RoomIdGuidStore = {};
    private readonly availableRoomIds: Set<
        number
    > = RoomIdStateProvider.initRoomIds();
    
    private readonly usedRoomIds: Set<number> = new Set<number>();
    public claimRoomId(): number {
        const roomArrayIdx = Math.floor(
            Math.random() * this.availableRoomIds.size
        );
        const roomId = this.availableRoomIds.entries()[roomArrayIdx];
        this.availableRoomIds.delete(roomId);
        this.usedRoomIds.add(roomId);
        return roomId;
    }
    public releaseRoomId(roomId: number) {
        this.usedRoomIds.delete(roomId);
        this.availableRoomIds.add(roomId);
        if (this.roomIdGameStore[roomId]) {
            delete this.roomIdGameStore[roomId];
        }
    }
    public assignGameToRoom(roomId: number, gameGuid: string) {
        this.roomIdGameStore[roomId] = gameGuid;
    }
    public lookupGameRoomGuid(roomId: number): string | null {
        const gameGuid = this.roomIdGameStore[roomId];
        if (typeof gameGuid !== "undefined") {
            return gameGuid;
        }
        return null;
    }
    private static initRoomIds(): Set<number> {
        return new Set(new Array(8999).fill(0).map((_, idx) => idx + 1000));
    }
}
