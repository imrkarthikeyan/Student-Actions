import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
const ICE_SERVERS = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
export function useMeetingCall(roomCode, displayName, enabled) {
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState({});
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [error, setError] = useState(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const pcsRef = useRef({});
    const namesRef = useRef({});
    const localStreamRef = useRef(null);
    const closePeer = useCallback((sid) => {
        pcsRef.current[sid]?.close();
        delete pcsRef.current[sid];
        delete namesRef.current[sid];
        setPeers((prev) => {
            const next = { ...prev };
            delete next[sid];
            return next;
        });
    }, []);
    const createPeerConnection = useCallback((socket, peerSid, peerName) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        namesRef.current[peerSid] = peerName;
        localStreamRef.current?.getTracks().forEach((track) => {
            pc.addTrack(track, localStreamRef.current);
        });
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket.emit('meeting:signal', {
                    target: peerSid,
                    signal: { type: 'candidate', candidate: e.candidate.toJSON() },
                });
            }
        };
        pc.ontrack = (e) => {
            setPeers((prev) => ({
                ...prev,
                [peerSid]: { sid: peerSid, name: namesRef.current[peerSid] ?? peerName, stream: e.streams[0] },
            }));
        };
        pcsRef.current[peerSid] = pc;
        return pc;
    }, []);
    useEffect(() => {
        if (!enabled)
            return;
        let cancelled = false;
        async function start() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                localStreamRef.current = stream;
                setLocalStream(stream);
            }
            catch {
                setError('Could not access camera or microphone. Check browser permissions and try again.');
                return;
            }
            const socket = io('/', { path: '/ws/socket.io', transports: ['websocket'] });
            socketRef.current = socket;
            socket.on('connect', () => {
                setConnected(true);
                socket.emit('meeting:join', { room_code: roomCode, name: displayName });
            });
            socket.on('disconnect', () => setConnected(false));
            socket.on('meeting:peers', async ({ peers: existing }) => {
                for (const peer of existing) {
                    setPeers((prev) => ({ ...prev, [peer.sid]: { sid: peer.sid, name: peer.name, stream: null } }));
                    const pc = createPeerConnection(socket, peer.sid, peer.name);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('meeting:signal', { target: peer.sid, signal: { type: 'offer', sdp: offer } });
                }
            });
            socket.on('meeting:peer_joined', ({ sid, name }) => {
                namesRef.current[sid] = name;
                setPeers((prev) => ({ ...prev, [sid]: { sid, name, stream: null } }));
            });
            socket.on('meeting:peer_left', ({ sid }) => closePeer(sid));
            socket.on('meeting:signal', async ({ sid, signal }) => {
                let pc = pcsRef.current[sid];
                if (signal.type === 'offer' && signal.sdp) {
                    if (!pc)
                        pc = createPeerConnection(socket, sid, namesRef.current[sid] ?? 'Guest');
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('meeting:signal', { target: sid, signal: { type: 'answer', sdp: answer } });
                }
                else if (signal.type === 'answer' && signal.sdp && pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                }
                else if (signal.type === 'candidate' && signal.candidate && pc) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                    }
                    catch {
                        /* benign: candidate arrived before remote description was set */
                    }
                }
            });
        }
        start();
        return () => {
            cancelled = true;
            socketRef.current?.emit('meeting:leave', { room_code: roomCode });
            socketRef.current?.disconnect();
            socketRef.current = null;
            Object.values(pcsRef.current).forEach((pc) => pc.close());
            pcsRef.current = {};
            namesRef.current = {};
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
            setPeers({});
            setLocalStream(null);
        };
    }, [enabled, roomCode, displayName, createPeerConnection, closePeer]);
    const toggleMic = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
        setMicOn((v) => !v);
    }, []);
    const toggleCamera = useCallback(() => {
        localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
        setCameraOn((v) => !v);
    }, []);
    return {
        localStream,
        peers: Object.values(peers),
        micOn,
        cameraOn,
        toggleMic,
        toggleCamera,
        error,
        connected,
    };
}
