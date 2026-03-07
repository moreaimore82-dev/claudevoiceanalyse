const fs = require('fs')
const zlib = require('zlib')

function createPNG(size, bgR, bgG, bgB) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function crc32(buf) {
    const table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      table[n] = c
    }
    let crc = 0xFFFFFFFF
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const t = Buffer.from(type, 'ascii')
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])))
    return Buffer.concat([len, t, data, c])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2

  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(size * rowSize)
  const cx = size / 2, cy = size / 2, r = size * 0.35

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0
    for (let x = 0; x < size; x++) {
      const off = y * rowSize + 1 + x * 3
      const dx = x - cx, dy = y - cy
      const inCircle = Math.sqrt(dx * dx + dy * dy) < r
      if (inCircle) {
        raw[off] = 43; raw[off + 1] = 127; raw[off + 2] = 255  // #2B7FFF
      } else {
        raw[off] = bgR; raw[off + 1] = bgG; raw[off + 2] = bgB
      }
    }
  }

  const compressed = zlib.deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

fs.writeFileSync('public/icon-192.png', createPNG(192, 7, 14, 27))
fs.writeFileSync('public/icon-512.png', createPNG(512, 7, 14, 27))
console.log('Icons created: public/icon-192.png, public/icon-512.png')
