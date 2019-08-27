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
    "url": "android-chrome-192x192.png",
    "revision": "0a38990d2c3aa49ecd9c517c0c6eb4fb"
  },
  {
    "url": "android-chrome-512x512.png",
    "revision": "eda9ac2115a344f076918592ee0f4430"
  },
  {
    "url": "apple-touch-icon.png",
    "revision": "c4ff485835f4be424fc2a43654f9d6c7"
  },
  {
    "url": "assets/images/dashboard.jpg",
    "revision": "43bdbec57098eecbd362376c9308f65e"
  },
  {
    "url": "assets/images/dashboard.webp",
    "revision": "a742de7e0ac7bd6a32bc2efd3f1d62aa"
  },
  {
    "url": "assets/images/nativ.jpg",
    "revision": "b2d371867815f735bf43b17fb3297e5c"
  },
  {
    "url": "assets/images/nativ.webp",
    "revision": "fb62199f07e60eb696c07a435348e550"
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
    "url": "assets/images/shopriverpark.jpg",
    "revision": "449e746902c6fe2af9ee98559ef92025"
  },
  {
    "url": "assets/images/shopriverpark.webp",
    "revision": "5b3203fe64d97ccbb34c329435c6c8ee"
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
    "url": "favicon-16x16.png",
    "revision": "6b88a5f1ff758a139a52f5aef3de561c"
  },
  {
    "url": "favicon-32x32.png",
    "revision": "6e28ef6c8db1967a9a5ffba224ce15d1"
  },
  {
    "url": "favicon.ico",
    "revision": "ae9ae1b084177269ba64875d0a357db0"
  },
  {
    "url": "index.html",
    "revision": "f320b1a0e08930f84a21ee11c7583995"
  },
  {
    "url": "robots.txt",
    "revision": "388ed88eec82ddeacbf877ee7dc4b225"
  },
  {
    "url": "scripts/app.js",
    "revision": "402a1112092c59cdb69b779947dfc731"
  },
  {
    "url": "site.webmanifest",
    "revision": "ec5a35acc0014d7d34b027c8fd0d0196"
  },
  {
    "url": "sitemap.xml",
    "revision": "a517e681169a72948c5cfe892d1161b4"
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
    "revision": "a16d4ab42ccc58f33ec5404446bc5d53"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
