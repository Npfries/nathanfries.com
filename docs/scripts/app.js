if ('serviceWorker' in navigator) {
    console.log('SW is supported')
    // Use the window load event to keep the page load performant
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}

document.getElementsByClassName('m-bottom-2')[1].getElementsByClassName.display = 'none'