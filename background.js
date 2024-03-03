let writing = false;
let utils;

async function storageGet(request, sender) {
	return new Promise(async function(resolve) {
		while (writing === true) { await utils.delay(100); };

	});
};

async function storageSet(request, sender) {
	return new Promise(async function(resolve) {
		while (writing === true) { await utils.delay(100); };

	});
};

async function init() {
	utils = await import(browser.runtime.getURL("../utils.js"));
};

init().then(function() {
	browser.runtime.onMessage.addListener(function(request, sender) {
		return new Promise(async function(resolve) {
			let func;
	
			if (request.type === "storage-get") { func = storageGet; };
	
			let resp = await func(request, sender);
			resolve(resp);
		});
	});
});