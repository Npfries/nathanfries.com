if ('serviceWorker' in navigator) {
    console.log('SW is supported')
    // Use the window load event to keep the page load performant
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}

(function(){
    window['gobot'] = window['gobot'] || function(){(window['gobot'].queue = window['gobot'].queue || []).push(arguments)}
    var script = document.createElement('script')
    script.async = 1
    script.src = 'https://www.getgobot.com/app/v1/gobot-client.js'
    var insert = document.getElementsByTagName('script')[0]
    insert.parentNode.insertBefore(script, insert)
})()
gobot('create', '-Ln1TbMDDodLjn8qrSs9')
gobot('pageview')