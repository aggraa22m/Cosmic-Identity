
import React, { useState, useCallback, useRef } from 'react';
import { AppState, ExplorerData, Universe } from './types';
import { UNIVERSES } from './constants';
import { Button } from './components/Button';
import { UniverseCard } from './components/UniverseCard';
import { generateMultiverseIdentity, playGeneratedAudio, getAudioBuffer, PlayingAudio } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe>(UNIVERSES[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [explorerData, setExplorerData] = useState<ExplorerData | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeAudioRef = useRef<PlayingAudio | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startDiscovery = async () => {
    if (!uploadedImage) return;

    setState(AppState.GENERATING_IMAGE);
    setError(null);

    try {
      const result = await generateMultiverseIdentity(
        uploadedImage, 
        selectedUniverse,
        (msg) => setLoadingMessage(msg)
      );
      
      setExplorerData({
        imageUrl: result.imageUrl,
        name: result.name,
        backstory: result.backstory,
        stats: result.stats,
        gender: result.gender,
        audioUrl: result.base64Audio
      });
      
      setState(AppState.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'The multiverse is currently unstable. Please try again.');
      setState(AppState.ERROR);
    }
  };

  const handlePlayAudio = async () => {
    if (explorerData?.audioUrl) {
      // Stop existing audio if playing
      if (activeAudioRef.current) {
        try { activeAudioRef.current.source.stop(); } catch(e) {}
        activeAudioRef.current.context.close();
      }
      
      const playing = await playGeneratedAudio(explorerData.audioUrl);
      activeAudioRef.current = playing;
      
      playing.source.onended = () => {
        if (activeAudioRef.current === playing) {
          activeAudioRef.current = null;
        }
      };
    }
  };

  const handleDownloadVideo = async () => {
    if (!explorerData || !explorerData.audioUrl) return;
    
    setIsExporting(true);
    try {
      const audioBuffer = await getAudioBuffer(explorerData.audioUrl);
      const duration = audioBuffer.duration;
      
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas context");

      const img = new Image();
      img.src = explorerData.imageUrl;
      await new Promise(r => img.onload = r);
      
      // Audio Setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      
      // Canvas Stream
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      recorder.start();
      source.start();

      // Render the image into the canvas while recording
      const render = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (recorder.state === 'recording') requestAnimationFrame(render);
      };
      render();

      await new Promise(r => setTimeout(r, (duration * 1000) + 500));
      
      recorder.stop();
      await new Promise(r => recorder.onstop = r);

      const videoBlob = new Blob(chunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `multiverse-${explorerData.name}.mp4`;
      a.click();
    } catch (err) {
      console.error('Video generation failed:', err);
      alert('Video synthesis failed. You can still download the image normally.');
    } finally {
      setIsExporting(false);
    }
  };

  const reset = () => {
    // 1. Stop any playing audio
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.source.stop();
      } catch (e) {
        // Source might already be stopped
      }
      activeAudioRef.current.context.close();
      activeAudioRef.current = null;
    }

    // 2. Reset App State
    setState(AppState.IDLE);
    setUploadedImage(null);
    setExplorerData(null);
    setError(null);
    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 glass">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <i className="fas fa-atom text-white"></i>
          </div>
          <h1 className="font-heading font-bold text-xl tracking-tight hidden sm:block">Multiverse Explorer</h1>
        </div>
        <div className="flex gap-4">
          {state === AppState.COMPLETED && (
             <Button variant="secondary" onClick={reset}>
              <i className="fas fa-redo"></i>
              <span className="hidden sm:inline">Start Over</span>
            </Button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-6xl mx-auto w-full">
        
        {state === AppState.IDLE && (
          <div className="w-full max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-5xl sm:text-7xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
                Discover Your Other Self
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Upload a photo to see how you exist in a different dimension. 
                Powered by Gemini's trans-dimensional reasoning.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Upload Section */}
              <div className="glass rounded-3xl p-8 border border-white/10 flex flex-col items-center justify-center gap-6 min-h-[350px]">
                {uploadedImage ? (
                  <div className="relative group w-full aspect-square max-w-[280px]">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded" 
                      className="w-full h-full object-cover rounded-2xl shadow-2xl border-4 border-white/10"
                    />
                    <button 
                      onClick={() => setUploadedImage(null)}
                      className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-purple-500/50 hover:bg-white/5 transition-all p-12"
                  >
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-gray-400 text-2xl group-hover:text-purple-400">
                      <i className="fas fa-cloud-upload-alt"></i>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-lg">Click to upload a selfie</p>
                      <p className="text-sm text-gray-500">JPG, PNG up to 10MB</p>
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>

              {/* Selection Section */}
              <div className="space-y-6">
                <h3 className="font-heading text-xl font-bold flex items-center gap-2">
                  <i className="fas fa-map-marked-alt text-purple-500"></i>
                  Select Destination
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {UNIVERSES.map(u => (
                    <UniverseCard 
                      key={u.id} 
                      universe={u} 
                      isSelected={selectedUniverse.id === u.id} 
                      onSelect={(id) => setSelectedUniverse(UNIVERSES.find(v => v.id === id)!)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <Button 
                onClick={startDiscovery} 
                disabled={!uploadedImage}
                className="w-full sm:w-auto h-16 px-12 text-lg uppercase tracking-widest shadow-2xl glow-purple"
              >
                Enter the Multiverse
                <i className="fas fa-arrow-right"></i>
              </Button>
            </div>
          </div>
        )}

        {(state === AppState.GENERATING_IMAGE || state === AppState.GENERATING_STORY || state === AppState.GENERATING_AUDIO || isExporting) && (
          <div className="flex flex-col items-center gap-8 text-center max-w-md animate-in fade-in zoom-in duration-500">
             <div className="relative">
              <div className="w-32 h-32 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-portal-exit text-4xl text-purple-500 animate-pulse-slow"></i>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-heading font-bold">{isExporting ? 'Synthesizing Video...' : 'Warping Space-Time...'}</h3>
              <p className="text-purple-400 font-mono text-sm uppercase tracking-widest animate-pulse">
                {isExporting ? 'Combining portrait and voice frequencies...' : loadingMessage}
              </p>
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && explorerData && !isExporting && (
          <div className="w-full grid lg:grid-cols-12 gap-12 items-center animate-in fade-in zoom-in duration-1000">
            {/* Image Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative group max-w-md w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[2.5rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-[#030712] rounded-[2.2rem] p-2 overflow-hidden aspect-square">
                   <img 
                    src={explorerData.imageUrl} 
                    alt="Multiverse Version" 
                    className="w-full h-full object-cover rounded-[2rem]"
                  />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="glass rounded-2xl p-4 flex items-center justify-between border border-white/20">
                      <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-widest">Dimension ID</p>
                        <p className="font-mono font-bold text-lg">{explorerData.stats.dimension}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                         <i className={`fas ${selectedUniverse.icon} text-xl text-white`}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold uppercase tracking-wider border border-purple-500/20">
                  <i className="fas fa-id-badge"></i>
                  Identity Decrypted
                </div>
                <h2 className="text-5xl font-heading font-bold text-white leading-tight">
                  {explorerData.name}
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed italic">
                  "{explorerData.backstory}"
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'Strength', val: explorerData.stats.strength, icon: 'fa-dumbbell', color: 'bg-red-500' },
                  { label: 'Intelligence', val: explorerData.stats.intelligence, icon: 'fa-brain', color: 'bg-blue-500' },
                  { label: 'Luck', val: explorerData.stats.luck, icon: 'fa-clover', color: 'bg-green-500' },
                ].map(stat => (
                  <div key={stat.label} className="glass p-4 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <i className={`fas ${stat.icon} text-white/40`}></i>
                      <span className="text-xs font-bold uppercase text-white/40">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-heading font-bold">{stat.val}</div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${stat.color} transition-all duration-1000 ease-out`} 
                        style={{ width: `${stat.val}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button onClick={handlePlayAudio} variant="primary" className="h-14 px-8 shadow-xl">
                  <i className="fas fa-volume-up"></i>
                  Hear Voice Greeting
                </Button>
                <div className="flex flex-wrap gap-2 w-full">
                  <Button 
                    onClick={handleDownloadVideo}
                    variant="secondary" 
                    className="h-14 px-8 flex-1 sm:flex-none border-purple-500/30 text-purple-300"
                  >
                    <i className="fas fa-video"></i>
                    Save Video (MP4)
                  </Button>
                  <Button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = explorerData.imageUrl;
                      link.download = `multiverse-${explorerData.name}.png`;
                      link.click();
                    }}
                    variant="secondary" 
                    className="h-14 px-8 flex-1 sm:flex-none"
                  >
                    <i className="fas fa-image"></i>
                    PNG
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="text-center space-y-6 max-w-md animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 text-3xl">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-heading font-bold">Nexus Point Collapsed</h3>
              <p className="text-gray-400">{error}</p>
            </div>
            <Button onClick={reset} variant="danger" className="w-full">
              Try Another Gateway
            </Button>
          </div>
        )}

      </main>

      <footer className="relative z-10 p-8 text-center text-gray-500 text-sm border-t border-white/5">
        <p>&copy; 2024 Multiverse Explorer • Powered by Gemini 2.5 & 3</p>
      </footer>
    </div>
  );
};

export default App;
