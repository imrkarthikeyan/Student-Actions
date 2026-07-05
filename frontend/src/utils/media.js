export const MEETING_MEDIA_CONSTRAINTS = {
    video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: 'user',
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    },
};

export async function getMeetingMediaStream() {
    return navigator.mediaDevices.getUserMedia(MEETING_MEDIA_CONSTRAINTS);
}