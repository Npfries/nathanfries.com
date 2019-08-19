/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "assets/images/dashboard.jpg",
    "revision": "43bdbec57098eecbd362376c9308f65e"
  },
  {
    "url": "assets/images/dashboard.webp",
    "revision": "a742de7e0ac7bd6a32bc2efd3f1d62aa"
  },
  {
    "url": "assets/images/notifications.jpg",
    "revision": "ff18511d265341f4a9f8c72c85a25ffb"
  },
  {
    "url": "assets/images/notifications.webp",
    "revision": "a3769376de1b387495a55fa85a7599ba"
  },
  {
    "url": "assets/images/workorder-held.jpg",
    "revision": "b9fd9402bcaae7894617f1830170e277"
  },
  {
    "url": "assets/images/workorder-held.webp",
    "revision": "9d95cc24ede6150ee9bb5d19f694d524"
  },
  {
    "url": "assets/images/workorder.jpg",
    "revision": "91d113f55e52cbafa4c2df6c9916be6a"
  },
  {
    "url": "assets/images/workorder.webp",
    "revision": "c35938ec004dbaf9ec70ad13121d3f44"
  },
  {
    "url": "components/nf-modal.js",
    "revision": "9f9bd84703afdf2fb34aabeb0ae0c83c"
  },
  {
    "url": "index.html",
    "revision": "14d6b24ad7f0ed5a7fb21b6f49d393df"
  },
  {
    "url": "scripts/app.js",
    "revision": "07a393ac8b8c348e57fb107fd591279d"
  },
  {
    "url": "styles/dispiro.css",
    "revision": "050ff56612d6becbb05eb76dbc3fbe8a"
  },
  {
    "url": "styles/normalize.css",
    "revision": "e1030567246d42c130844834dafa2249"
  },
  {
    "url": "styles/style.css",
    "revision": "082fb744e65e0a9eec2dac56add68a9e"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
