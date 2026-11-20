const fs = require("fs/promises");

// Delete files from disk. Used when an upload is rejected, so no junk is left behind.
// Errors are ignored on purpose: if the file is already gone, that's fine.
exports.removeFiles = (files) =>
  Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));

// The browser tells us "this is a JPEG" (file.mimetype), but anyone can lie about that.
// Every real image file STARTS with a fixed signature ("magic bytes").
// We read the first 12 bytes and check them, so a renamed .exe or .html is rejected.
exports.hasImageSignature = async (filePath) => {
  const handle = await fs.open(filePath, "r");
  try {
    const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    // WebP files look like: "RIFF" + 4 size bytes + "WEBP"
    const isWebp =
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";

    return isJpeg || isPng || isWebp;
  } finally {
    await handle.close();
  }
};
