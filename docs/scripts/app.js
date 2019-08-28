if ('serviceWorker' in navigator) {
    console.log('SW is supported')
    // Use the window load event to keep the page load performant
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}
setTimeout(() => {
    (function (id, src, attrs) {
        if (document.getElementById(id)) {
          return;
        }
        var js = document.createElement('script');
        js.src = src;
        js.type = 'text/javascript';
        js.id = id;
        for (var name in attrs) { if(attrs.hasOwnProperty(name)) { js.setAttribute(name, attrs[name]); } }
        var e = document.getElementsByTagName('script')[0];
        e.parentNode.insertBefore(js, e);
      })('hubspot-messages-loader', 'https://js.usemessages.com/conversations-embed.js', {"data-loader":"hs-scriptloader","data-hsjs-portal":6319049,"data-hsjs-env":"prod"});
      
      (function (id, src, attrs) {
        if (document.getElementById(id)) {
          return;
        }
        var js = document.createElement('script');
        js.src = src;
        js.type = 'text/javascript';
        js.id = id;
        for (var name in attrs) { if(attrs.hasOwnProperty(name)) { js.setAttribute(name, attrs[name]); } }
        var e = document.getElementsByTagName('script')[0];
        e.parentNode.insertBefore(js, e);
      })('CollectedForms-6319049', 'https://js.hscollectedforms.net/collectedforms-b.js', {"crossorigin":"anonymous","data-leadin-portal-id":6319049,"data-leadin-env":"prod","data-loader":"hs-scriptloader","data-hsjs-portal":6319049,"data-hsjs-env":"prod"});
      
      (function (id, src) {
        if (document.getElementById(id)) { return; }
        var js = document.createElement('script');
        js.src = src;
        js.type = 'text/javascript';
        js.id = id;
        var e = document.getElementsByTagName('script')[0];
        e.parentNode.insertBefore(js, e);
      })('hs-analytics', 'https://js.hs-analytics.net/analytics/1566944100000/6319049.js');
}, 7000)
