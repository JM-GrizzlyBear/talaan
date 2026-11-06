// Tiny files with the right first bytes, so they're recognized like real ones
export const JPG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(200, 1),
]);
export const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(100, 2),
]);
export const HEIC = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from("ftypheic"),
  Buffer.alloc(100, 3),
]);
