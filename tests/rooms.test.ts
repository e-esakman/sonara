import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { io, type Socket } from 'socket.io-client';
import { setupConversationRoomServer } from '../backend/rooms/liveConversationServer.ts';

function event(socket: Socket, name: string): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), 3000);
        socket.once(name, payload => { clearTimeout(timeout); resolve(payload); });
    });
}

test('two friends exchange audio without AI credentials; room capacity and reconnect ownership are enforced', async () => {
    const server = createServer();
    const rooms = setupConversationRoomServer(server, ['http://localhost:5173']);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}`;
    const clients: Socket[] = [];
    const connect = async () => {
        const client = io(url, { transports: ['websocket'], reconnection: false });
        clients.push(client);
        await event(client, 'connect');
        return client;
    };
    try {
        const host = await connect();
        const created = event(host, 'invite-room-created');
        host.emit('create-invite-room', { name: 'Host' });
        const invitation = await created;
        assert.ok(invitation.reconnectToken);
        const guest = await connect();
        const hostReady = event(host, 'room-ready');
        const guestReady = event(guest, 'room-ready');
        guest.emit('join-room', { roomId: invitation.roomId, name: 'Friend' });
        const [a, b] = await Promise.all([hostReady, guestReady]);
        assert.equal(a.role, 'userA');
        assert.equal(b.role, 'userB');
        assert.notEqual(a.reconnectToken, b.reconnectToken);
        for (const [sender, receiver] of [[host, guest], [guest, host]]) {
            const received = event(receiver, 'partner-audio');
            const pcmData = Buffer.from([0, 0, 255, 127, 0, 128]).toString('base64');
            sender.emit('audio-stream', { pcmData });
            assert.equal((await received).audio, pcmData);
        }
        const stranger = await connect();
        const full = event(stranger, 'room-error');
        stranger.emit('join-room', { roomId: a.roomId });
        assert.match((await full).message, /two people/);
        const denied = event(stranger, 'room-error');
        stranger.emit('rejoin-room', { roomId: a.roomId, role: 'userA', reconnectToken: b.reconnectToken });
        assert.match((await denied).message, /Unable to restore/);
        host.disconnect();
        const restored = await connect();
        const rejoined = event(restored, 'room-ready');
        restored.emit('rejoin-room', { roomId: a.roomId, role: 'userA', reconnectToken: a.reconnectToken });
        assert.equal((await rejoined).role, 'userA');
        const ended = event(guest, 'room-ended');
        restored.emit('leave-room');
        assert.match((await ended).message, /left/);
        const expired = event(stranger, 'room-error');
        stranger.emit('join-room', { roomId: a.roomId });
        assert.match((await expired).message, /invalid or expired/);
    } finally {
        for (const client of clients) client.disconnect();
        await new Promise<void>(resolve => rooms.close(() => resolve()));
    }
});
