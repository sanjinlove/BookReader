import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import Storage from '../services/StorageService';

const PdfReader = forwardRef(({
  bookId, filePath, fontSize, darkMode,
  onTextSelected, onPositionChange, onTap,
}, ref) => {
  const wv = useRef(null);
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');

  useImperativeHandle(ref, () => ({
    goToPosition(pos) {
      wv.current?.injectJavaScript(
        `try{document.getElementById('page-'+${pos.page}).scrollIntoView({behavior:'smooth'})}catch(e){} true;`
      );
    },
  }));

  useEffect(() => {
    (async () => {
      const b64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const saved = await Storage.getPosition(bookId);
      setHtml(buildPdfHTML(b64, saved?.page || 1));
    })();
  }, []);

  const onMessage = async (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') setLoading(false);
      if (msg.type === 'page') {
        const pos = {
          page: msg.p, total: msg.t,
          percentage: msg.p / msg.t,
          label: `第 ${msg.p} / ${msg.t} 页`,
        };
        onPositionChange?.(pos);
        await Storage.savePosition(bookId, pos);
        await Storage.updateBook(bookId, { progress: (msg.p / msg.t) * 100 });
      }
      if (msg.type === 'sel') {
        onTextSelected?.({ text: msg.text, position: { page: msg.p } });
      }
      if (msg.type === 'tap') onTap?.();
    } catch {}
  };

  if (!html) return <View style={s.center}><ActivityIndicator size="large" color="#e94560" /></View>;

  return (
    <View style={{ flex: 1 }}>
      {loading && <View style={s.overlay}><ActivityIndicator size="large" color="#e94560" /></View>}
      <WebView
        ref={wv} originWhitelist={['*']}
        source={{ html }} onMessage={onMessage}
        javaScriptEnabled domStorageEnabled
        style={{ flex: 1 }}
      />
    </View>
  );
});

function buildPdfHTML(b64, savedPage) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
<style>
*{margin:0;padding:0}
body{background:#e8e8e8;display:flex;flex-direction:column;align-items:center}
.pw{margin:8px auto;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.12)}
.pw canvas{display:block;width:100%;height:auto}
.pn{text-align:center;padding:4px;font-size:11px;color:#999;font-family:sans-serif}
</style></head><body>
<div id="c"></div>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
var curP=${savedPage},totP=0;
function S(t,d){try{window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:t},d||{})))}catch(e){}}

(async function(){
  try{
    var raw=atob('${b64}');
    var u8=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++) u8[i]=raw.charCodeAt(i);

    var pdf=await pdfjsLib.getDocument({data:u8}).promise;
    totP=pdf.numPages;
    var con=document.getElementById('c');
    var vw=window.innerWidth-16;
    var dpr=window.devicePixelRatio||1;

    for(var p=1;p<=totP;p++){
      var pg=await pdf.getPage(p);
      var vp0=pg.getViewport({scale:1});
      var sc=(vw/vp0.width)*dpr;
      var vp=pg.getViewport({scale:sc});

      var w=document.createElement('div');
      w.className='pw'; w.id='page-'+p; w.style.width=vw+'px';

      var cv=document.createElement('canvas');
      cv.width=vp.width; cv.height=vp.height;
      w.appendChild(cv);

      var lb=document.createElement('div');
      lb.className='pn'; lb.textContent=p+' / '+totP;
      w.appendChild(lb);

      con.appendChild(w);
      await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
    }

    if(curP>1){var el=document.getElementById('page-'+curP);if(el)el.scrollIntoView();}
    S('ready');

    // 追踪当前页
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          var id=parseInt(en.target.id.replace('page-',''));
          if(id!==curP){curP=id;S('page',{p:id,t:totP});}
        }
      });
    },{threshold:0.5});
    document.querySelectorAll('.pw').forEach(function(el){obs.observe(el);});

    // 文本选择
    document.addEventListener('mouseup',function(){
      var s=window.getSelection();
      var t=s?s.toString().trim():'';
      if(t.length>0) S('sel',{text:t,p:curP});
    });

  }catch(err){S('error',{msg:err.message});}
})();
<\/script></body></html>`;
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center',
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10,
  },
});

export default PdfReader;