/**
 * An in-memory "database". Data lives in plain arrays and is lost when the
 * server stops, which is exactly what a test target wants: every run can
 * start from the same known state.
 *
 * A class groups the data with the functions that change it. `private`
 * means only code inside the class can touch the arrays directly.
 */
import { rangesOverlap } from '../shared/dates.ts';
import type {
    BookedRange,
    Booking,
    BookingInput,
    Message,
    MessageInput,
    Room,
    RoomInput,
} from '../shared/schemas.ts';
import { seedBookings, seedRooms } from './seed.ts';

export class Store {
    private rooms: Room[] = [];
    private bookings: Booking[] = [];
    private messages: Message[] = [];
    private nextId = 1;

    constructor() {
        this.reset();
    }

    /** Wipes everything and loads the seed data again. */
    reset(): void {
        this.rooms = [];
        this.bookings = [];
        this.messages = [];
        this.nextId = 1;
        const created = seedRooms().map((room) => this.createRoom(room));
        for (const { roomIndex, ...booking } of seedBookings()) {
            const room = created[roomIndex];
            if (room) this.createBooking({ ...booking, roomId: room.id });
        }
    }

    // ---------- Rooms ----------

    listRooms(): Room[] {
        return [...this.rooms];
    }

    /** `Room | undefined`: the return type tells callers to handle "not found". */
    getRoom(id: number): Room | undefined {
        return this.rooms.find((room) => room.id === id);
    }

    createRoom(input: RoomInput): Room {
        const room: Room = { id: this.nextId++, ...input };
        this.rooms.push(room);
        return room;
    }

    updateRoom(id: number, input: RoomInput): Room | undefined {
        const index = this.rooms.findIndex((room) => room.id === id);
        if (index === -1) return undefined;
        const updated: Room = { id, ...input };
        this.rooms[index] = updated;
        return updated;
    }

    /** Deleting a room also removes its bookings. */
    deleteRoom(id: number): boolean {
        const before = this.rooms.length;
        this.rooms = this.rooms.filter((room) => room.id !== id);
        this.bookings = this.bookings.filter((b) => b.roomId !== id);
        return this.rooms.length < before;
    }

    // ---------- Bookings ----------

    listBookings(): Booking[] {
        return [...this.bookings];
    }

    bookedRanges(roomId: number): BookedRange[] {
        return this.bookings
            .filter((b) => b.roomId === roomId)
            .map(({ checkIn, checkOut }) => ({ checkIn, checkOut }));
    }

    hasClash(input: BookingInput): boolean {
        return this.bookings.some(
            (b) => b.roomId === input.roomId && rangesOverlap(b, input)
        );
    }

    createBooking(input: BookingInput): Booking {
        const booking: Booking = {
            id: this.nextId++,
            ...input,
            createdAt: new Date().toISOString(),
        };
        this.bookings.push(booking);
        return booking;
    }

    deleteBooking(id: number): boolean {
        const before = this.bookings.length;
        this.bookings = this.bookings.filter((b) => b.id !== id);
        return this.bookings.length < before;
    }

    // ---------- Messages ----------

    listMessages(): Message[] {
        // Newest first.
        return [...this.messages].reverse();
    }

    getMessage(id: number): Message | undefined {
        return this.messages.find((m) => m.id === id);
    }

    createMessage(input: MessageInput): Message {
        const message: Message = {
            id: this.nextId++,
            ...input,
            read: false,
            createdAt: new Date().toISOString(),
        };
        this.messages.push(message);
        return message;
    }

    markMessageRead(id: number): Message | undefined {
        const message = this.getMessage(id);
        if (message) message.read = true;
        return message;
    }

    deleteMessage(id: number): boolean {
        const before = this.messages.length;
        this.messages = this.messages.filter((m) => m.id !== id);
        return this.messages.length < before;
    }

    unreadCount(): number {
        return this.messages.filter((m) => !m.read).length;
    }
}
