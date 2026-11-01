/**
 * Distinct Linx / Xrobot voices for all nine seats.
 *
 * The voice IDs come from GET https://xrobo.qiniu.com/v1/voices. The TTS
 * websocket bridge sends the per-seat voice through `agent_params.voice`, so
 * every line can use a different voice even when the same device is reused.
 */
export const VOICE_BY_SEAT = {
  1: { id: '2029740684041216001', name: '电台男主播', pitch: 0.82, speed: 0.95 },
  2: { id: '2bdf7391fe9647ebb8483f267a86d7b4', name: '温柔闺蜜女', pitch: 1.02, speed: 0.96 },
  3: { id: 'f566cb22237b46e7bc90924fa285bcb8', name: '沉稳青年男', pitch: 0.86, speed: 0.93 },
  4: { id: 'b6a1aa749bd94c9c811444443ae1fa5c', name: '博才说书男', pitch: 0.98, speed: 0.9 },
  5: { id: '9d91653b2adf4aa9ad97e1c8f63fbda3', name: '磁性低音男', pitch: 0.78, speed: 0.9 },
  6: { id: 'e4ddd3f3271c4f51a36c0889799aaeea', name: '温柔甜美女', pitch: 1.08, speed: 0.97 },
  7: { id: '2029739560654675970', name: '温润青年', pitch: 0.92, speed: 1.03 },
  8: { id: '2003718048531505154', name: '可爱女生', pitch: 1.12, speed: 1.03 },
  9: { id: 'a42e04fcefac4e9492581fbc95f3fce3', name: '睿智青年男', pitch: 0.84, speed: 0.92 },
};

export function voiceForSeat(seat) {
  return VOICE_BY_SEAT[Number(seat)] ?? null;
}
