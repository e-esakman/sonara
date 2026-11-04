import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePronunciation } from '../services/pronunciationService';
import type { AnalysisResult } from '../services/pronunciationService';
import { geminiLiveService } from '../services/geminiLiveService';
import { useStore } from '../store/useStore';
const META_COACH_PATTERNS=[
    /\b(evaluating|re-evaluated|refining|confirming|analyzing|analysis|strategizing|planning|preparing|noted|homing in on|focusing on|clarifying|crafting|intention|goal)\b/,
    /\b(the user|they are|their progress|performance in this area|another evaluation|positive reinforcement|lingering slight mispronunciation)\b/,
    /\b(i|i'm|i’ve|i have|my)\b/,
];
const USER_FACING_PATTERNS=[
    /\/[^/]+\/$/,
    /\b(you|your|try|repeat|focus|stress|sound|syllable|pronunciation|listen|say|word|practice|again|slowly|correct)\b/,
];
const sanitizeCoachChunk=(text: string) => {
    const normalized=text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
    const sentences=normalized
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
    const filtered=sentences.filter(sentence => {
        const lower=sentence.toLowerCase();
        if (/^(clarifying|evaluating|refining|confirming|focusing)\b/i.test(sentence)) {
            return false;
        }
        return !META_COACH_PATTERNS.some(pattern => pattern.test(lower));
    });
    const userFacing=filtered.filter(sentence => USER_FACING_PATTERNS.some(pattern => pattern.test(sentence.toLowerCase())||pattern.test(sentence)));
    const metaDetected=sentences.some(sentence => META_COACH_PATTERNS.some(pattern => pattern.test(sentence.toLowerCase()))
        ||/^(clarifying|evaluating|refining|confirming|focusing)\b/i.test(sentence));
    const sanitized=(userFacing.length>0? userFacing:metaDetected? []:filtered).join(' ')
        .replace(/\s+([,.!?;:])/g, '$1')
        .trim();
    return sanitized;
};
const FreeSpeakMode=() => {
    const { accentStyle }=useStore();
    // Live AI Coach state
    const [liveStatus, setLiveStatus]=useState<string>('Disconnected');
    const [liveRecording, setLiveRecording]=useState(false);
    // Live AI Coach Analysis logic
    const [liveMessages, setLiveMessages]=useState<Array<{
        id: string;
        role: 'user'|'coach';
        text: string;
        analysis?: AnalysisResult;
    }>>([{
        id: 'welcome_msg',
        role: 'coach',
        text: "Hi there! I'm Sonara, your AI pronunciation coach. Tap the microphone and say something, and we can start practicing together!"
    }]);
    const handleTranscript=useCallback((text: string) => {
        const id=crypto.randomUUID();
        setLiveMessages(previous => [...previous, { id, role: 'user', text }]);
        analyzePronunciation(text, text, accentStyle)
            .then(analysis => setLiveMessages(previous => previous.map(message =>
                message.id===id? { ...message, analysis }:message)))
            .catch(error => console.error('[FreeSpeakMode] Analysis error:', error));
    }, [accentStyle]);
    const { startRecording: startLiveTranscriptRecording, stopRecording: stopLiveTranscriptRecording }=
        useSpeechRecognition({ onTranscript: handleTranscript });
    const audioContextRef=useRef<AudioContext|null>(null);
    const micContextRef=useRef<AudioContext|null>(null);
    const audioQueueRef=useRef<AudioBufferSourceNode[]>([]);
    const liveStreamRef=useRef<MediaStream|null>(null);
    const liveRecorderRef=useRef<ScriptProcessorNode|null>(null);
    const nextAudioTimeRef=useRef<number>(0);
    const stopAudioPlayback=useCallback(() => {
        audioQueueRef.current.forEach(source => {
            try {
                source.stop();
            }
            catch { /* Playback may already have ended. */ }
        });
        audioQueueRef.current=[];
        nextAudioTimeRef.current=0;
        geminiLiveService.interrupt();
    }, []);
    // Gemini Live callbacks
    const currentCoachTurnIdRef=useRef<string|null>(null);
    useEffect(() => {
        geminiLiveService.onStatus=setLiveStatus;
        geminiLiveService.onTextResponse=(t) => {
            const sanitizedText=sanitizeCoachChunk(t);
            if (!sanitizedText)
                return;
            setLiveMessages(prev => {
                const last=prev[prev.length-1];
                if (currentCoachTurnIdRef.current&&last&&last.id===currentCoachTurnIdRef.current) {
                    const updated=[...prev];
                    const nextCoachText=sanitizeCoachChunk(`${last.text} ${sanitizedText}`);
                    updated[updated.length-1]={
                        ...last,
                        text: nextCoachText,
                    };
                    return updated;
                }
                else {
                    const newId=crypto.randomUUID();
                    currentCoachTurnIdRef.current=newId;
                    return [...prev, { id: newId, role: 'coach', text: sanitizedText }];
                }
            });
        };
        geminiLiveService.onTurnComplete=() => {
            currentCoachTurnIdRef.current=null;
        };
        geminiLiveService.onAudioResponse=(base64Audio) => {
            try {
                const binaryString=atob(base64Audio);
                const bytes=new Uint8Array(binaryString.length);
                for (let i=0;i<binaryString.length;i++)
                    bytes[i]=binaryString.charCodeAt(i);
                if (!audioContextRef.current) {
                    audioContextRef.current=new AudioContext();
                }
                const ctx=audioContextRef.current;
                const float32Data=new Float32Array(bytes.length/2);
                const dataView=new DataView(bytes.buffer);
                for (let i=0;i<float32Data.length;i++)
                    float32Data[i]=dataView.getInt16(i*2, true)/32768.0;
                const audioBuffer=ctx.createBuffer(1, float32Data.length, 24000);
                audioBuffer.getChannelData(0).set(float32Data);
                const source=ctx.createBufferSource();
                source.buffer=audioBuffer;
                source.connect(ctx.destination);
                if (nextAudioTimeRef.current<ctx.currentTime)
                    nextAudioTimeRef.current=ctx.currentTime;
                source.start(nextAudioTimeRef.current);
                nextAudioTimeRef.current+=audioBuffer.duration;
                audioQueueRef.current.push(source);
                source.onended=() => {
                    const idx=audioQueueRef.current.indexOf(source);
                    if (idx>-1)
                        audioQueueRef.current.splice(idx, 1);
                };
            }
            catch (e) {
                console.error('[FreeSpeakMode] Audio error:', e);
            }
        };
        geminiLiveService.onError=(err) => {
            console.error('[FreeSpeakMode] Live error:', err);
            setLiveStatus('Error: '+err.message);
        };
        return () => {
            geminiLiveService.stopSession();
            stopAudioPlayback();
            audioContextRef.current?.close().catch(() => { });
            audioContextRef.current=null;
            micContextRef.current?.close().catch(() => { });
            micContextRef.current=null;
        };
    }, [stopAudioPlayback]);
    const startLiveRecording=useCallback(async () => {
        stopAudioPlayback();
        try {
            const stream=await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
            });
            liveStreamRef.current=stream;
            if (!micContextRef.current) {
                micContextRef.current=new AudioContext({ sampleRate: 16000 });
            }
            const micCtx=micContextRef.current;
            const source=micCtx.createMediaStreamSource(stream);
            const processor=micCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(micCtx.destination);
            processor.onaudioprocess=(e) => {
                const outputData=e.outputBuffer.getChannelData(0);
                outputData.fill(0);
                const inputData=e.inputBuffer.getChannelData(0);
                const pcm16=new Int16Array(inputData.length);
                for (let i=0;i<inputData.length;i++) {
                    const s=Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i]=s<0? s*0x8000:s*0x7FFF;
                }
                const bytes=new Uint8Array(pcm16.buffer);
                let binary='';
                for (let i=0;i<bytes.byteLength;i++)
                    binary+=String.fromCharCode(bytes[i]);
                geminiLiveService.sendAudioChunk(btoa(binary));
            };
            liveRecorderRef.current=processor;
            setLiveRecording(true);
            startLiveTranscriptRecording();
        }
        catch (e) {
            console.error('[FreeSpeakMode] Mic error:', e);
            setLiveRecording(false);
        }
    }, [startLiveTranscriptRecording, stopAudioPlayback]);
    const stopLiveRecording=useCallback(() => {
        if (!liveRecording&&!liveRecorderRef.current)
            return;
        setLiveRecording(false);
        geminiLiveService.sendAudioStreamEnd();
        if (liveRecorderRef.current) {
            liveRecorderRef.current.disconnect();
            liveRecorderRef.current=null;
        }
        if (liveStreamRef.current) {
            liveStreamRef.current.getTracks().forEach(t => t.stop());
            liveStreamRef.current=null;
        }
        stopLiveTranscriptRecording();
    }, [liveRecording, stopLiveTranscriptRecording]);
    const toggleLiveRecording=useCallback(async () => {
        if (liveRecording) {
            stopLiveRecording();
        }
        else {
            try {
                await geminiLiveService.startSession();
                await startLiveRecording();
            }
            catch (error) {
                const message=error instanceof Error? error.message:'Could not start the coach';
                geminiLiveService.onError(new Error(message));
                setLiveStatus('Disconnected');
            }
        }
    }, [liveRecording, startLiveRecording, stopLiveRecording]);
    return <div className="flex flex-col gap-8 lg:gap-10 items-start">
        {/* Left: Speaking area */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="w-full">
            <div className="bg-white rounded-[32px] p-8 sm:p-10 md:p-12 shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-neutral-100/80 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-violet-50/80 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                {/* Mode toggle */}

                {/* Prompt text */}
                <div className="relative z-10 text-center mb-10">
                    <h2 className="text-[28px] md:text-[32px] font-dm-sans font-semibold text-[#111] tracking-tight mb-3">
                        {'Talk to Your AI Coach'}
                    </h2>
                    <p className="text-neutral-500 font-sans text-[15px] md:text-base max-w-lg mx-auto leading-relaxed">
                        {'Tap the mic to start a conversational practice session with your AI speaking coach.'}
                    </p>
                </div>

                {/* Live transcript sections */}
                {<div className="relative z-10 mb-6 flex flex-col gap-6 w-full">
                    <div className="flex-1 overflow-y-auto p-2 sm:p-4 flex flex-col gap-6 max-h-[400px]">
                        {liveMessages.map((msg) => {
                            if (msg.role==='coach') {
                                const coachText=sanitizeCoachChunk(msg.text);
                                if (!coachText)
                                    return null;
                                return <div key={msg.id} className="flex gap-3 sm:gap-4 max-w-[90%] sm:max-w-[85%]">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-1 flex-shrink-0">
                                        <Icon icon="solar:stars-bold-duotone" width="16" className="text-indigo-600" />
                                    </div>
                                    <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-sm p-3 sm:p-4 shadow-sm">
                                        <p className="text-sm sm:text-base font-sans text-neutral-800 leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                            {coachText}
                                        </p>
                                        <span className="text-xs text-neutral-400 mt-2 block font-sans">
                                            Just now
                                        </span>
                                    </div>
                                </div>;
                            }
                            else {
                                return <div key={msg.id} className="flex gap-3 sm:gap-4 max-w-[90%] sm:max-w-[85%] self-end flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mt-1 flex-shrink-0">
                                        <span className="text-indigo-700 font-bold text-xs font-sans uppercase">You</span>
                                    </div>
                                    <div className="bg-indigo-600 rounded-2xl rounded-tr-sm p-3 sm:p-4 shadow-sm text-left">
                                        {msg.analysis?
                                            <p className="text-sm sm:text-base font-sans leading-relaxed text-white" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                {msg.text.split(/\s+/).map((word, i) => {
                                                    const clean=word.toLowerCase().replace(/[.,!?;:'"]/g, '');
                                                    const isIncorrect=msg.analysis!.incorrectWords.map(w => w.toLowerCase()).includes(clean);
                                                    const isUnclear=msg.analysis!.unclearWords?.map(w => w.toLowerCase()).includes(clean);
                                                    let colorClass="text-white";
                                                    if (isIncorrect)
                                                        colorClass="bg-rose-500 text-white px-1 rounded-sm border-b-2 border-rose-300 font-bold";
                                                    else if (isUnclear)
                                                        colorClass="bg-amber-500 text-white px-1 rounded-sm border-b-2 border-amber-300 font-bold";
                                                    return <span key={i} className={`${colorClass} mr-1 inline-block`}>{word}</span>;
                                                })}
                                            </p>
                                            :
                                            <p className="text-sm sm:text-base font-sans text-white leading-relaxed" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                {msg.text.trim()}
                                            </p>}
                                        <div className="flex items-center justify-end gap-1 mt-2">
                                            <span className="text-xs text-indigo-200 font-sans">Just now</span>
                                            <Icon icon="solar:check-read-linear" className="w-4 h-4 text-indigo-200" />
                                        </div>
                                    </div>
                                </div>;
                            }
                        })}
                    </div>
                </div>}

                {/* Mic controls */}
                <div className="relative z-10 flex justify-center items-center gap-6 mt-8">
                    {<>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={stopAudioPlayback} className="w-14 h-14 flex items-center justify-center rounded-full bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200 hover:text-[#111] transition-colors" title="Stop AI playback">
                            <Icon icon="solar:stop-circle-linear" width="24" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleLiveRecording} className={`w-20 h-20 sm:w-[88px] sm:h-[88px] flex items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgba(99,102,241,0.25)] transition-colors hover:shadow-[0_12px_40px_rgba(99,102,241,0.35)] touch-none select-none relative ${liveRecording? 'bg-rose-500':'bg-gradient-to-br from-indigo-500 to-indigo-700'}`} aria-label={liveRecording? 'Stop speaking':'Start speaking'}>
                            {liveRecording&&<div className="absolute inset-0 rounded-full animate-ping bg-rose-400 opacity-40"></div>}
                            <Icon icon={liveRecording? 'solar:stop-bold':'solar:microphone-2-bold'} width="36" className="relative z-10" />
                        </motion.button>
                    </>}
                </div>

                {/* Status */}
                <div className="text-center mt-4 text-sm font-medium font-sans min-h-[20px]">
                    {liveRecording&&
                        <span className="text-rose-500 animate-pulse flex items-center gap-2 justify-center">
                            <Icon icon="line-md:loading-twotone-loop" /> Listening to you... (tap mic to stop)
                        </span>}
                    {!liveRecording&&
                        <span className="text-emerald-500 flex items-center gap-2 justify-center">{liveStatus} — Tap the mic to speak</span>}
                </div>
            </div>
        </motion.div>

    </div>;
};
export default FreeSpeakMode;
