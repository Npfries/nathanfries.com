WebFontConfig = {
    google: {
      families: ['Kalam']
    },
    timeout: 2000 // Set the timeout to two seconds
  };

 (function(d) {
    var wf = d.createElement('script'), s = d.scripts[0];
    wf.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';
    wf.async = true;
    s.parentNode.insertBefore(wf, s);
 })(document);

window.onload = () => {  
    'use strict';     
    if ('serviceWorker' in navigator) {     
       navigator.serviceWorker     
         .register('./sw.js'); 
    };
};