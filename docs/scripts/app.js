if ('serviceWorker' in navigator) {
    console.log('SW is supported')
    // Use the window load event to keep the page load performant
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}

// Get the first script element on the page
var ref = document.getElementsByTagName( 'script' )[ 0 ];

// Create a new script element
var script = document.createElement( 'script' );

// Set the script element `src`
script.src = '//js.hs-scripts.com/6319049.js';

// Inject the script into the DOM
ref.parentNode.insertBefore( script, ref );