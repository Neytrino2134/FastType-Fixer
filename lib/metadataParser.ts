
import { TagMetadata } from '../types';

export const parseAudioMetadata = async (file: File): Promise<{ tags: TagMetadata; artworkUrl?: string }> => {
  const tags: TagMetadata = {};
  let artworkUrl: string | undefined = undefined;

  try {
    // Read the first 512KB. Usually enough for headers and high-res art.
    const headerBuffer = await readChunk(file, 0, 512 * 1024); 
    const view = new DataView(headerBuffer);

    // Check for ID3 identifier
    if (String.fromCharCode(...new Uint8Array(headerBuffer, 0, 3)) !== 'ID3') {
        return { tags, artworkUrl }; 
    }

    const version = view.getUint8(3); // 3 or 4 usually
    const size = decodeSyncSafe(view.getUint32(6));
    
    // Safety check: if header implies size larger than our chunk, we might miss data.
    // For now we rely on the chunk. If needed we could read more, but 512KB is generous for metadata.
    // If the tag is massive (e.g. 2MB image), we might need to read the full tag size.
    let workingBuffer = headerBuffer;
    let workingView = view;

    if (size > headerBuffer.byteLength) {
        // Tag is larger than initial chunk, read the specific tag area
        // Limit to 5MB to prevent memory issues with massive embedded PNGs
        const safeSize = Math.min(size, 5 * 1024 * 1024); 
        workingBuffer = await readChunk(file, 0, safeSize + 10);
        workingView = new DataView(workingBuffer);
    }
    
    let offset = 10; // Skip Header
    const limit = workingBuffer.byteLength;

    while (offset < limit) {
        // Frame Header (10 bytes)
        if (offset + 10 > limit) break;
        
        let frameId = "";
        for(let i=0; i<4; i++) frameId += String.fromCharCode(workingView.getUint8(offset + i));
        
        // Stop on padding (null bytes)
        if (frameId.charCodeAt(0) === 0) break;

        let frameSize = workingView.getUint32(offset + 4);
        
        // ID3v2.4 uses syncsafe integers for frame size. v2.3 uses regular integers.
        if (version === 4) {
            frameSize = decodeSyncSafe(frameSize);
        }

        // Skip Flags (2 bytes)
        offset += 10;

        if (offset + frameSize > limit) break;

        // Parse Frame Content
        if (frameId === 'TIT2') tags.title = parseTextFrame(workingView, offset, frameSize);
        else if (frameId === 'TPE1') tags.artist = parseTextFrame(workingView, offset, frameSize);
        else if (frameId === 'TALB') tags.album = parseTextFrame(workingView, offset, frameSize);
        else if (frameId === 'TYER') tags.year = parseTextFrame(workingView, offset, frameSize); // v2.3
        else if (frameId === 'TDRC') tags.year = parseTextFrame(workingView, offset, frameSize); // v2.4
        else if (frameId === 'TRCK') tags.trackNumber = parseTextFrame(workingView, offset, frameSize);
        else if (frameId === 'TCON') tags.genre = parseTextFrame(workingView, offset, frameSize);
        else if (frameId === 'APIC') {
            const pic = parsePictureFrame(workingBuffer, offset, frameSize);
            if (pic) artworkUrl = pic;
        }

        offset += frameSize;
    }

  } catch (e) {
    console.warn("Metadata parse failed", e);
  }

  return { tags, artworkUrl };
};

const readChunk = (file: File, start: number, length: number): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const blob = file.slice(start, start + length);
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
};

const decodeSyncSafe = (value: number) => {
    return (
        ((value & 0x7f000000) >>> 3) |
        ((value & 0x007f0000) >>> 2) |
        ((value & 0x00007f00) >>> 1) |
        (value & 0x0000007f)
    );
};

const parseTextFrame = (view: DataView, offset: number, length: number): string => {
    if (length <= 1) return "";
    const encoding = view.getUint8(offset);
    let text = "";
    
    // 0 = ISO-8859-1, 1 = UTF-16 BOM, 2 = UTF-16BE, 3 = UTF-8
    const buffer = new Uint8Array(view.buffer, view.byteOffset + offset + 1, length - 1);
    
    let decoderLabel = 'iso-8859-1';
    if (encoding === 1 || encoding === 2) decoderLabel = 'utf-16';
    if (encoding === 3) decoderLabel = 'utf-8';

    const decoder = new TextDecoder(decoderLabel);
    try {
        text = decoder.decode(buffer).replace(/\0/g, '');
    } catch(e) {}
    return text;
};

const parsePictureFrame = (buffer: ArrayBuffer, offset: number, length: number): string | undefined => {
    try {
        const view = new DataView(buffer);
        const encoding = view.getUint8(offset);
        let pos = offset + 1;
        
        // MIME type
        let mimeType = "";
        while (view.getUint8(pos) !== 0 && pos < offset + length) {
            mimeType += String.fromCharCode(view.getUint8(pos));
            pos++;
        }
        pos++; // skip null terminator

        // Picture type (1 byte)
        // const picType = view.getUint8(pos);
        pos++;

        // Description (null-terminated string, encoding dependent)
        // If encoding is 1 or 2 (UTF-16), null is 2 bytes.
        const isWideChar = (encoding === 1 || encoding === 2);
        
        while (pos < offset + length) {
            if (view.getUint8(pos) === 0) {
                if (isWideChar) {
                    // Check next byte for double null or see if we are aligned
                    if (pos + 1 < offset + length && view.getUint8(pos + 1) === 0) {
                        pos += 2;
                        break;
                    }
                    // Sometimes messy tags don't align, just increment
                } else {
                    pos++;
                    break;
                }
            }
            pos++;
        }

        // The rest is image data
        const dataSize = (offset + length) - pos;
        if (dataSize <= 0) return undefined;

        const imgData = buffer.slice(pos, pos + dataSize);
        const blob = new Blob([imgData], { type: mimeType });
        return URL.createObjectURL(blob);
    } catch (e) {
        return undefined;
    }
};
