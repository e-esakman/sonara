import { io, type Socket } from 'socket.io-client';

export type RoomReadyPayload = {
    roomId: string;
    role: 'userA' | 'userB';
    selfLabel: string;
    partnerLabel: string;
};

export type InviteRoomCreatedPayload = {
    roomId: string;
    shareUrl: string;
    role: 'userA';
    selfLabel: string;
};

export type TranscriptEntry = {
    id: string;
    roomId: string;
    speakerRole: 'userA' | 'userB';
    speakerLabel: string;
    transcript: string;
    createdAt: string;
};

export type LiveTranscriptPayload = {
    roomId: string;
    transcript: string;
    isFinal: boolean;
    speakerRole: 'userA' | 'userB';
    speakerLabel: string;
    createdAt: string;
};

export type UserPresencePayload = {
    roomId: string;
    participants: Array<{ role: 'userA' | 'userB'; label: string }>;
};

export type UserLeftPayload = {
    roomId: string;
    speakerLabel: string;
};

export type UserConnectedPayload = {
    title: string;
    message: string;
};

export type ClientTranscriptPayload = {
    transcript: string;
};

export type AIFeedback = {
    transcript: string;
    correction: string;
    pronunciationTip: string;
    interruptTip: string;
    severity: 'green' | 'yellow' | 'red';
    speechText: string;
    createdAt: string;
};

const browserBackendUrl =
    typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : 'http://localhost:3000';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || browserBackendUrl;

export function createConversationRoomSocket(): Socket {
    return io(BACKEND_URL, {
        withCredentials: true,
        reconnection: true,
        transports: ['polling'],
    });
}

export function copyToClipboard(value: string) {
    return navigator.clipboard.writeText(value);
}

export function getShareUrl(roomId: string) {
    return `${window.location.origin}/rooms?room=${encodeURIComponent(roomId)}`;
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

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                reject(new Error('Unable to convert audio blob'));
                return;
            }

            const base64 = result.split(',')[1];
            if (!base64) {
                reject(new Error('Invalid audio blob result'));
                return;
            }

            resolve(base64);
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
        reader.readAsDataURL(blob);
    });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
}
