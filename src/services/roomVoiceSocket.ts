const browserBackendOrigin =
    typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : 'http://localhost:3000';

const backendHttpUrl = import.meta.env.VITE_BACKEND_URL || browserBackendOrigin;

export const ROOM_VOICE_WS_URL = import.meta.env.VITE_ROOM_VOICE_WS_URL
    || backendHttpUrl.replace(/^http/i, 'ws') + '/room-voice-ws';

export function float32ToInt16(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, input[index]));
        output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return output;
}

export function downsampleBuffer(input: Float32Array, inputSampleRate: number, outputSampleRate: number) {
    if (inputSampleRate === outputSampleRate) {
        return float32ToInt16(input);
    }

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(input.length / sampleRateRatio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;

        for (let index = offsetBuffer; index < nextOffsetBuffer && index < input.length; index += 1) {
            accum += input[index];
            count += 1;
        }

        const sample = count > 0 ? accum / count : 0;
        const clamped = Math.max(-1, Math.min(1, sample));
        result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        offsetResult += 1;
        offsetBuffer = nextOffsetBuffer;
    }

    return result;
}

export function mergeInt16Chunks(chunks: Int16Array[]) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Int16Array(totalLength);
    let offset = 0;

    chunks.forEach((chunk) => {
        merged.set(chunk, offset);
        offset += chunk.length;
    });

    return merged;
}

export function int16ToBase64(input: Int16Array) {
    const bytes = new Uint8Array(input.buffer);
    let binary = '';
    for (let index = 0; index < bytes.byteLength; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
}

export function normalizeWord(word: string) {
    return word.toLowerCase().replace(/[^a-z']/g, '');
}
