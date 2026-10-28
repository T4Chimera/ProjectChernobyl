// Local synthesized nonverbal effects and optional browser speech placeholders.
// No copyrighted recordings or external sound URLs are used.
export function createAudio() {
  let ctx=null,master=null,enabled=true,lastSpeech=0;
  const api={
    start(){
      if(!ctx){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)return;
        ctx=new Audio();master=ctx.createGain();master.gain.value=0.16;master.connect(ctx.destination);
      }
      ctx.resume().catch(()=>{});
    },
    setEnabled(value){enabled=value;if(master)master.gain.setTargetAtTime(value?0.16:0,ctx.currentTime,0.05);if(!value)window.speechSynthesis?.cancel();},
    tone(freq=330,duration=.09,type='sine',volume=.2){
      if(!ctx||!enabled)return;
      const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;
      g.gain.setValueAtTime(volume,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
      o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+duration);
    },
    shot(){
      if(!ctx||!enabled)return;
      const size=Math.floor(ctx.sampleRate*.11),buffer=ctx.createBuffer(1,size,ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<size;i++)data[i]=(Math.random()*2-1)*(1-i/size)**3;
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1900;
      source.buffer=buffer;source.connect(filter);filter.connect(master);source.start();api.tone(76,.12,'triangle',.6);
    },
    hurt(){api.tone(74,.22,'triangle',.35);},
    radio(){api.tone(850,.06,'sine',.12);setTimeout(()=>api.tone(1100,.04,'sine',.08),85);},
    speak(text,speaker='Overwatch',priority=false){
      if(!enabled||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
      const now=performance.now();if(!priority&&now-lastSpeech<3000)return;
      lastSpeech=now;
      if(priority)window.speechSynthesis.cancel();
      if(window.speechSynthesis.pending&&!priority)return;
      const u=new SpeechSynthesisUtterance(text.replace(/\[[^\]]*\]/g,''));
      if(!u.text.trim())return;
      u.volume=.35;u.rate=speaker==='Overwatch'?1.05:1.13;
      u.pitch=speaker==='Katya'?1.13:speaker==='Overwatch'?.86:.62;
      window.speechSynthesis.speak(u);
    },
    stop(){window.speechSynthesis?.cancel();ctx?.suspend();},
  };
  return api;
}
