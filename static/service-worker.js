//@ts-nocheck
const CACHE = 'v.8481';

self.addEventListener('install', function (evt) {
	console.log('The service worker is being installed.');

	evt.waitUntil(precache());
});
self.addEventListener('fetch', function (evt) {
	evt.respondWith(
		caches.match(evt.request).then(function (response) {
			return response || fetch(evt.request);
		})
	);
});
function precache() {
	self.caches.keys().then(keys => {
		keys.forEach(key => {
			if (key != CACHE) caches.delete(key);
		})
	});

	return caches.open(CACHE).then(function (cacheFiles) {
		return cacheFiles.addAll([
			'./index.html',
			'./room',
			'./css/room.css',
			'./css/lobby.css',
			'./scripts/lobby.js',
			'./scripts/game.js',
			'./images/UNO.png',
			'./images/logo.png',
			'./images/small_icon.png',
			'./images/lock.png',
			'./images/warning.png'
		]);
	});
}