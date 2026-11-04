import { io, type Socket } from 'socket.io-client';
import { getRequiredBackendUrl } from './backendConfig';

export type RoomReadyPayload = {
    roomId: string;
    role: 'userA' | 'userB';
    selfLabel: string;
    reconnectToken: string;
    partnerLabel: string;
};

export type InviteRoomCreatedPayload = {
    roomId: string;
    shareUrl: string;
    role: 'userA';
    selfLabel: string;
    reconnectToken: string;
};

export type TranscriptEntry = {
    id: string;
    roomId: string;
    speakerRole: 'userA' | 'userB';
    speakerLabel: string;
    transcript: string;
    createdAt: string;
};

export type AIFeedback = {
    transcript: string;
    correction: string;
    pronunciationTip: string;
    createdAt: string;
    rows?: PronunciationFeedbackRow[];
};

export type PronunciationFeedbackRow = {
    word: string;
    userPronunciation: string;
    correctPronunciation: string;
    phonetic: string;
    tip: string;
};

export function createConversationRoomSocket(): Socket {
    return io(getRequiredBackendUrl(), {
        withCredentials: true,
        reconnection: true,
        transports: ['websocket', 'polling'],
    });
}

export function copyToClipboard(value: string) {
    return navigator.clipboard.writeText(value);
}

export function pcmFloat32ToBase64(input: Float32Array) {
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}
