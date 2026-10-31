import { reactive } from 'vue';

export interface SeatPoint {
  seat: number;
  x: number;
  y: number;
  visible: boolean;
}

export const seatProjection = reactive<{
  list: SeatPoint[];
  width: number;
  height: number;
  ready: boolean;
}>({
  list: [],
  width: 0,
  height: 0,
  ready: false,
});

export function setSeatPoints(list: SeatPoint[], width: number, height: number): void {
  seatProjection.list = list;
  seatProjection.width = width;
  seatProjection.height = height;
  seatProjection.ready = true;
}

export function clearSeatPoints(): void {
  seatProjection.list = [];
  seatProjection.ready = false;
}

export function pointFor(seat: number): SeatPoint | undefined {
  return seatProjection.list.find((point) => point.seat === seat);
}
