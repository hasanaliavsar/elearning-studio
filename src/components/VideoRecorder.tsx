import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Video, Monitor, Camera, Circle, Square, Pause, Play,
  RotateCcw, Check, X, Loader2, AlertCircle
} from 'lucide-react';

type RecordingMode = 'webcam' | 'screen' | 'screen-webcam';
type RecordingStatus = 'idle' | 'previewing' | 'recording' | 'paused' | 'recorded';

interface VideoRecorderModalProps {
  open: boolean;
  onClose: () => void;
  onRecordingComplete: (videoUrl: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function VideoRecorderModal({ open, onClose, onRecordingComplete }: VideoRecorderModalProps) {
  const [mode, setMode] = useState<RecordingMode>('webcam');
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedSize, setRecordedSize] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const previewRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const webcamOverlayRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Enumerate webcam devices
  useEffect(() => {
    if (!open) return;
    navigator.mediaDevices.enumerateDevices().then(allDevices => {
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0]!.deviceId);
      }
    }).catch(() => {
      // Permissions not yet granted; devices will be re-enumerated after getUserMedia
    });
  }, [open, selectedDeviceId]);

  const stopAllStreams = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    webcamStreamRef.current?.getTracks().forEach(t => t.stop());
    webcamStreamRef.current = null;
    canvasStreamRef.current?.getTracks().forEach(t => t.stop());
    canvasStreamRef.current = null;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    stopAllStreams();
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    chunksRef.current = [];
    setStatus('idle');
    setElapsed(0);
    setRecordedUrl(null);
    setRecordedSize(0);
    setError(null);
  }, [stopAllStreams, stopTimer, recordedUrl]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) {
      cleanup();
    }
    return () => {
      stopTimer();
      stopAllStreams();
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPreview = useCallback(async (targetMode: RecordingMode, deviceId?: string) => {
    setError(null);
    stopAllStreams();

    try {
      if (targetMode === 'webcam') {
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Re-enumerate devices after permission grant
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoInputs);
        if (videoInputs.length > 0 && !deviceId) {
          setSelectedDeviceId(videoInputs[0]!.deviceId);
        }

        if (previewRef.current) {
          previewRef.current.srcObject = stream;
          previewRef.current.muted = true;
          previewRef.current.play().catch(() => {});
        }
      } else if (targetMode === 'screen') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        streamRef.current = screenStream;

        // If getDisplayMedia didn't provide audio, add mic audio
        if (screenStream.getAudioTracks().length === 0) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStream.getAudioTracks().forEach(track => screenStream.addTrack(track));
          } catch {
            // Mic not available, proceed without audio
          }
        }

        // Handle user stopping screen share via browser UI
        screenStream.getVideoTracks()[0]!.onended = () => {
          if (status === 'recording' || status === 'paused') {
            stopRecording();
          } else {
            stopAllStreams();
            setStatus('idle');
          }
        };

        if (previewRef.current) {
          previewRef.current.srcObject = screenStream;
          previewRef.current.muted = true;
          previewRef.current.play().catch(() => {});
        }
      } else {
        // screen-webcam: get both streams
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const webcamConstraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId }, width: 320, height: 240 } : { width: 320, height: 240 },
          audio: true,
        };
        const webcamStream = await navigator.mediaDevices.getUserMedia(webcamConstraints);
        webcamStreamRef.current = webcamStream;

        // Show webcam in overlay
        if (webcamOverlayRef.current) {
          webcamOverlayRef.current.srcObject = webcamStream;
          webcamOverlayRef.current.muted = true;
          webcamOverlayRef.current.play().catch(() => {});
        }

        // Composite with canvas
        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;
        const screenVideo = document.createElement('video');
        screenVideo.srcObject = screenStream;
        screenVideo.muted = true;
        await screenVideo.play();

        canvas.width = screenVideo.videoWidth || 1920;
        canvas.height = screenVideo.videoHeight || 1080;
        const ctx = canvas.getContext('2d')!;

        const webcamVideo = document.createElement('video');
        webcamVideo.srcObject = webcamStream;
        webcamVideo.muted = true;
        await webcamVideo.play();

        const drawFrame = () => {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          // Draw webcam overlay in bottom-right corner
          const pipWidth = 240;
          const pipHeight = 180;
          const margin = 16;
          const pipX = canvas.width - pipWidth - margin;
          const pipY = canvas.height - pipHeight - margin;

          // Rounded rectangle background
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(pipX - 3, pipY - 3, pipWidth + 6, pipHeight + 6, 12);
          ctx.fillStyle = '#1e1b4b';
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipWidth, pipHeight, 10);
          ctx.clip();
          ctx.drawImage(webcamVideo, pipX, pipY, pipWidth, pipHeight);
          ctx.restore();

          animFrameRef.current = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        const canvasStream = canvas.captureStream(30);
        canvasStreamRef.current = canvasStream;

        // Add audio tracks
        const audioTracks = [
          ...screenStream.getAudioTracks(),
          ...webcamStream.getAudioTracks(),
        ];
        // Use webcam audio as primary
        if (audioTracks.length > 0) {
          audioTracks.forEach(track => canvasStream.addTrack(track));
        }

        streamRef.current = screenStream;

        // Handle user stopping screen share via browser UI
        screenStream.getVideoTracks()[0]!.onended = () => {
          if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            stopRecording();
          } else {
            stopAllStreams();
            setStatus('idle');
          }
        };

        if (previewRef.current) {
          previewRef.current.srcObject = canvasStream;
          previewRef.current.muted = true;
          previewRef.current.play().catch(() => {});
        }
      }

      setStatus('previewing');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Permission') || message.includes('NotAllowed') || message.includes('denied')) {
        setError('Permission denied. Please allow access to your camera/screen and try again.');
      } else if (message.includes('NotFound') || message.includes('DevicesNotFound')) {
        setError('No camera or microphone found. Please connect a device and try again.');
      } else if (message.includes('AbortError') || message.includes('cancelled')) {
        // User cancelled screen picker - not an error
        setStatus('idle');
      } else {
        setError(`Failed to access media: ${message}`);
      }
    }
  }, [stopAllStreams]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = useCallback(() => {
    setError(null);
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setError('Your browser does not support video recording. Please use a modern browser like Chrome or Firefox.');
      return;
    }

    const recordingStream = (mode === 'screen-webcam' && canvasStreamRef.current)
      ? canvasStreamRef.current
      : streamRef.current;

    if (!recordingStream) {
      setError('No media stream available. Please start a preview first.');
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(recordingStream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setRecordedSize(blob.size);
      setStatus('recorded');
      stopTimer();
      stopAllStreams();
    };

    recorder.start(1000); // Collect data every second
    setElapsed(0);
    setStatus('recording');

    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }, [mode, stopAllStreams, stopTimer]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    stopTimer();
  }, [stopTimer]);

  const pauseRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.pause();
      setStatus('paused');
      stopTimer();
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'paused') {
      recorderRef.current.resume();
      setStatus('recording');
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
  }, []);

  const handleReRecord = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedUrl(null);
    setRecordedSize(0);
    setElapsed(0);
    chunksRef.current = [];
    setStatus('idle');
  }, [recordedUrl]);

  const handleUseRecording = useCallback(() => {
    if (recordedUrl) {
      onRecordingComplete(recordedUrl);
      onClose();
    }
  }, [recordedUrl, onRecordingComplete, onClose]);

  const handleModeChange = useCallback((newMode: RecordingMode) => {
    if (status === 'recording' || status === 'paused') return;
    if (status === 'previewing') {
      stopAllStreams();
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedUrl(null);
    setRecordedSize(0);
    setElapsed(0);
    setError(null);
    setMode(newMode);
    setStatus('idle');
  }, [status, stopAllStreams, recordedUrl]);

  const handleDeviceChange = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (status === 'previewing') {
      startPreview(mode, deviceId);
    }
  }, [status, mode, startPreview]);

  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  if (!open) return null;

  const modeOptions: { key: RecordingMode; label: string; icon: typeof Video }[] = [
    { key: 'webcam', label: 'Webcam', icon: Camera },
    { key: 'screen', label: 'Screen', icon: Monitor },
    { key: 'screen-webcam', label: 'Screen + Webcam', icon: Video },
  ];

  const isRecordingActive = status === 'recording' || status === 'paused';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-brand-700">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white tracking-wide">Record Video</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
            disabled={isRecordingActive}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Mode selector tabs */}
          <div className="flex gap-2 mb-4">
            {modeOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleModeChange(key)}
                disabled={isRecordingActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${isRecordingActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Video preview / playback area */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
            {/* Live preview */}
            {status !== 'recorded' && (
              <>
                <video
                  ref={previewRef}
                  className="w-full h-full object-contain"
                  playsInline
                  muted
                  style={{ display: status === 'idle' ? 'none' : 'block' }}
                />
                {/* Webcam overlay for screen-webcam mode (visible indicator only) */}
                {mode === 'screen-webcam' && (status === 'previewing' || isRecordingActive) && (
                  <video
                    ref={webcamOverlayRef}
                    className="absolute bottom-3 right-3 w-36 h-28 rounded-lg border-2 border-brand-900 object-cover shadow-lg"
                    playsInline
                    muted
                    style={{ display: 'none' }} // Hidden because canvas handles compositing
                  />
                )}
              </>
            )}

            {/* Recorded playback */}
            {status === 'recorded' && recordedUrl && (
              <video
                ref={playbackRef}
                className="w-full h-full object-contain"
                src={recordedUrl}
                controls
                playsInline
              />
            )}

            {/* Idle state placeholder */}
            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                {mode === 'webcam' && <Camera className="w-12 h-12 mb-3 opacity-40" />}
                {mode === 'screen' && <Monitor className="w-12 h-12 mb-3 opacity-40" />}
                {mode === 'screen-webcam' && <Video className="w-12 h-12 mb-3 opacity-40" />}
                <p className="text-sm">Click &quot;Start Preview&quot; to begin</p>
              </div>
            )}

            {/* Recording indicator */}
            {status === 'recording' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 backdrop-blur-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-white text-sm font-mono font-medium">{formatTime(elapsed)}</span>
              </div>
            )}

            {/* Paused indicator */}
            {status === 'paused' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 backdrop-blur-sm">
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                </span>
                <span className="text-white text-sm font-mono font-medium">{formatTime(elapsed)}</span>
                <span className="text-yellow-400 text-xs font-medium">PAUSED</span>
              </div>
            )}
          </div>

          {/* Device selector (webcam modes only, before recording) */}
          {(mode === 'webcam' || mode === 'screen-webcam') && !isRecordingActive && status !== 'recorded' && devices.length > 1 && (
            <div className="mb-4">
              <label className="label">Camera</label>
              <select
                className="input"
                value={selectedDeviceId}
                onChange={e => handleDeviceChange(e.target.value)}
              >
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* File size indicator */}
          {status === 'recorded' && recordedSize > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
              <Video className="w-4 h-4" />
              <span>Recording size: {formatFileSize(recordedSize)}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {/* Idle state */}
            {status === 'idle' && (
              <>
                <button onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => startPreview(mode, selectedDeviceId || undefined)}
                  className="btn-primary"
                >
                  <Loader2 className="w-4 h-4 hidden" />
                  {mode === 'screen' || mode === 'screen-webcam' ? (
                    <>
                      <Monitor className="w-4 h-4" />
                      Start Preview
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Start Preview
                    </>
                  )}
                </button>
              </>
            )}

            {/* Previewing state */}
            {status === 'previewing' && (
              <>
                <button onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={startRecording}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                >
                  <Circle className="w-4 h-4 fill-current" />
                  Start Recording
                </button>
              </>
            )}

            {/* Recording state */}
            {status === 'recording' && (
              <>
                <button
                  onClick={pauseRecording}
                  className="btn-secondary"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Recording
                </button>
              </>
            )}

            {/* Paused state */}
            {status === 'paused' && (
              <>
                <button
                  onClick={resumeRecording}
                  className="btn-secondary"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Recording
                </button>
              </>
            )}

            {/* Recorded state */}
            {status === 'recorded' && (
              <>
                <button onClick={handleReRecord} className="btn-secondary">
                  <RotateCcw className="w-4 h-4" />
                  Re-record
                </button>
                <button onClick={handleUseRecording} className="btn-primary">
                  <Check className="w-4 h-4" />
                  Use Recording
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
