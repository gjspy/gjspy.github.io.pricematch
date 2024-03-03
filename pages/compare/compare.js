let utils;
let currentNagResponse = "";

async function display(job) {
	let c = document.getElementById("template").cloneNode(true);
	c.id = "";
	c.getElementsByClassName("prod-header")[0].textContent = job.store.toUpperCase();
	c.getElementsByClassName("prod-img")[0].src = job.imageUrl;
	c.getElementsByClassName("prod-price")[0].textContent = utils.formatPrice(job.price);
	c.getElementsByClassName("prod-weight")[0].textContent = job.weight;

	let name = c.getElementsByClassName("prod-name")[0];
	name.textContent = job.name;
	name.href = job.url;

	c.style = "display: inline-grid; justify-items: center;";
	
	document.getElementsByClassName("container")[0].append(c);
};

async function main() {
	currentNagResponse = "pls wait";

	const params = new URLSearchParams(document.location.search);
	let store;
	let id;

	for (let n of Object.keys(utils.STORES_URLS)) {
		n = n.toLowerCase();
		id = params.get(n);

		if (id) {
			store = n;
			break;
		};
	};

	let url = utils.productUrl(id, store);
	const storage = await utils.storageGet();

	console.log(url,"compare.js",storage.matches[url]);

	if (!storage.matches[url] || storage.matches[url].others.length !== utils.ALL_STORES.length-1 || params.get("forceMatch") === "true") {
		//const tab = await browser.tabs.getCurrent();
		browser.tabs.create({//tab.id,
			active:true,
			url: "/pages/match/index.html?" + store + "=" + id
		});

		window.close();

		currentNagResponse = "matching";
		return;
	};

	const otherUrls = storage.matches[url].others;
	const thisInfo = await utils.cacheGet(url);

	display(thisInfo);

	var toGather = []; //ge cached information (they are matched)
	var allInfo = {};

	for (let i of otherUrls) {
		const iInfo = await utils.cacheGet(i);

		if (iInfo) { display(iInfo); allInfo[iInfo.store] = iInfo; }
		else { toGather.push(i) };
	};


	async function onStorageChange(changes, area) {
		if (area !== "local") { return; };
		if (changes.job.oldValue === changes.job.newValue) { return; };

		console.log("compare.main changes:", changes);

		let job = changes.job.newValue.got;

		for (let u of toGather) {
			let store = utils.storeFromUrl(u, false);

			if (job[u]) {
				display(job[u]);
				allInfo[job[u].store] = job[u];

				toGather.splice(toGather.indexOf(u), 1);
			};
		};

		if (toGather.length === 0) {
			browser.storage.onChanged.removeListener(listener);
			document.getElementById("loading").remove();

			currentNagResponse = {"stores": allInfo, "product": thisInfo};

			const storage = await utils.storageGet();
			storage.job = {};
			await browser.storage.local.set(storage);
		};
	};


	if (toGather.length > 0) {
		storage.job = {"info": {"bulk": toGather, "type":"product"}, "got":{}};

		await browser.storage.local.set(storage);
		
		var listener = function(changes, area) {
			onStorageChange(changes, area);
		};

		browser.storage.onChanged.addListener(listener);

		for (let i of toGather) {
			browser.tabs.create({ url: i, active: false });
		};
	} else {
		document.getElementById("loading").remove();

		currentNagResponse = {"stores": allInfo, "product": thisInfo};

		/*const resp = await browser.runtime.sendMessage({
			compareData: {"stores": allInfo, "product": thisInfo}
		});

		const tab = await browser.tabs.getCurrent();

		if (resp.response === 200) {
			if (tab.active === false) {
				window.close();
			};
		} else if (tab.active === false) {
			browser.tabs.update(tab.id, {active:true, highlighted:true});
		};*/
	};
};

function onNag(request, sender, response) {
	console.log(JSON.stringify(request));

	if (request.type === "popup->compare data") {
		if (currentNagResponse.product && currentNagResponse.stores) {
			window.close();
		};

		response({ response: currentNagResponse});
	};
};

async function init() {
	utils = await import(browser.runtime.getURL("../utils.js"));

	browser.runtime.onMessage.addListener(onNag);
};

init().then(main);