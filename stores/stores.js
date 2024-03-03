let utils;
let thisUrl;
let ELEMENTS;

async function checkedBox(item, store, url) {
	const storage = await utils.storageGet();
	
	let lsi = utils.scrapeListItemInfo(item, store);
	await utils.cacheSet(utils.prettyUrl(lsi.url), lsi);
	storage.job.got[url] = lsi;
	
	await browser.storage.local.set(storage);

	/*if (storage.lastTab) {
		browser.tabs.update(storage.lastTab.id, {active:true, highlighted:true});
	};*/
	
	window.close();
	document.querySelector("html").innerHTML = "Couldn't close automatically<br>Please return to match window."
};

async function manualSearch(storage, store) {
	console.log("MANUALSEARCH");
	const topMenu = document.getElementsByClassName(ELEMENTS[store].topBar)[0];
	
	let matchText = storage.job.info.url || storage.job.info.search;
	matchText = matchText.replace(utils[store.toUpperCase() + "_SEARCH"], "");
	matchText = matchText.replaceAll("%20"," ");

	const a = document.createElement("a");
	a.innerHTML = "Matching: " + matchText;
	a.style = ELEMENTS[store].aStyle;

	topMenu.insertAdjacentElement("afterbegin", a);

	let allResults = Array.from(document.getElementsByClassName(ELEMENTS[store].lsResult));

	const storageWeight = storage.job.info.weight;

	for (let i of allResults) {
		let thisWeight = i.getElementsByClassName(ELEMENTS[store].lsiWeight)[0].innerText;

		if (utils.matchWeights(storageWeight, thisWeight)) {
			i.style.background = ELEMENTS[store].colour;
		};

		const c = document.createElement("input");
		c.type = "checkbox";
		c.style = ELEMENTS[store].boxStyle;
		c.addEventListener("click", function() { checkedBox(i, store, storage.job.info.url); });

		if (store === "asda") {
			i.children[0].children[0].insertAdjacentElement("afterbegin", c);
		} else if (store === "morrisons") {
			if (i.children.length > 1) {
				i.children[1].insertAdjacentElement("afterbegin",c);
			} else {
				i.children[0].insertAdjacentElement("afterbegin", c);
			};
		};
	};
};

async function scrapingSearch(store, hybrid) {
	let allResults = Array.from(document.getElementsByClassName(ELEMENTS[store].lsResult));
	let sliced = allResults.slice(0, Math.min(allResults.length, utils.RESULTS_TO_LOAD));

	let usefulResults = [];
	let toCache = {};

	await utils.delay(100);

	for (let i of sliced) {
		console.log("waiting");
		await utils.waitFor(i,ELEMENTS[store].lsiImage);
		console.log("waitinf2");
		await utils.waitForContent(i, ELEMENTS[store].lsiName);

		console.log("waited");

		const lsi = utils.scrapeListItemInfo(i, store);
		//await utils.cacheSet(utils.prettyUrl(lsi.url), lsi);
		toCache[utils.prettyUrl(lsi.url)] = lsi;

		usefulResults.push(lsi);
	};

	console.log("AMT GOT FRMO SEARCH:", sliced.length);

	const storage = await utils.cacheSet(toCache,null, false);
	storage.job.got[window.location.href] = usefulResults;
	await browser.storage.local.set(storage);

	window.close();
};

async function fromSearch(store, storage) {
	console.log("waitinf or container or fail",ELEMENTS[store].resCont);
	await utils.waitFor(document,ELEMENTS[store].resCont, true, document);

	console.log("got resultContainer")

	if (utils.didSearchFail(document) === true && storage.job.info.searchMode !== "free") {
		const storage = await utils.storageGet();
		storage.job.got[window.location.href] = [{
			"store":store
		}];
		await browser.storage.local.set(storage);

		console.log("set failed");

		window.close();
		return;
	};

	console.log("didnt fail");

	await utils.waitForEntries(ELEMENTS[store].lsiImage);
	console.log("got entries", store);

	if (storage.job.info.searchMode === "free") {
		setTimeout(manualSearch, 500, storage, store);
	} else if (storage.job.info.searchMode.includes("hybrid")) {
		scrapingSearch(store, true);
		setTimeout(manualSearch, 500, storage, store);
	} else {
		scrapingSearch(store);
	};
};


async function fromProduct(store) {
	console.log("waiting 1", window.location.href);
	await utils.waitFor(document, ELEMENTS[store].prodName);

	console.log("waiting 2");
	await utils.waitFor(document,ELEMENTS[store].prodImage);

	console.log("waiting 3");
	await utils.waitForContent(document, ELEMENTS[store].prodName);

	console.log("waited all");

	const info = utils.scrapeProductInfo(document, store, window.location.href);

	//alternative to getting storage - this returns it but with cache in!
	const storage = await utils.cacheSet(info.url, info, false); 
	if (!storage.job.got) { storage.job["got"] = {} };
	storage.job.got[info.url] = info;

	await browser.storage.local.set(storage);
	//await utils.cacheSet(info.url, info);

	window.close();
};

async function quickCache(loc, store) {
	console.log(loc);
	if (loc.includes("product")) {
		const pretty = utils.prettyUrl(loc);
		const cached = await utils.cacheGet(pretty);

		console.log(cached);

		if (!cached) {
			await utils.waitFor(document, ELEMENTS[store].prodName);
			await utils.waitFor(document,ELEMENTS[store].prodImage);
			await utils.waitForContent(document, ELEMENTS[store].prodName);

			await utils.cacheSet(pretty, utils.scrapeProductInfo(document, store, loc));
		};
	} else if (loc.includes("search")) {
		let allResults = Array.from(document.getElementsByClassName(ELEMENTS[store].lsResult));
		let sliced = allResults.slice(0, Math.min(allResults.length, utils.RESULTS_TO_LOAD));
		let toCache = {};

		await utils.delay(100);
		console.log(sliced);

		for (let i of sliced) {
			await utils.waitFor(i,ELEMENTS[store].lsiImage);

			try {
				let lsi = utils.scrapeListItemInfo(i, store);
				toCache[utils.prettyUrl(lsi.url)] = lsi;
			} catch (e) { console.log(e); };
		};

		await utils.cacheSet(toCache);
		console.log(toCache);
	};
};

async function main() {
	const loc = window.location.href;
	thisUrl = loc;

	let store = utils.storeFromUrl(loc);
	const storage = await utils.storageGet();

	console.log("hello")

	if (!storage.job) { quickCache(loc, store); return; };
	const info = storage.job.info;

	if (
		(!info) ||
		(info.bulk.length === 0) ||
		(info.type === "product" && !storage.job.info.bulk.includes(utils.prettyUrl(loc))) ||
		(info.type === "search" && !info.searchMode.includes("free") && !storage.job.info.bulk.includes(utils.prettyUrl(loc))) ||
		//(info.type === "search" && (info.searchMode !== "free" && info.search !== loc)) ||//!!!
		(storage.job.got && storage.job.got[loc])
	) { 
		console.log("returning");
		quickCache(loc, store);
		return;
	};

	for (let i of ELEMENTS[store].banned) {
		for (let e of document.getElementsByClassName(i)) {
			e.remove();
		};
	};

	if (info.type === "product") {
		fromProduct(store);
	} else if (info.type === "search") {
		fromSearch(store, storage);
	};
};

async function init() {
	utils = await import(browser.runtime.getURL("../utils.js"));
	ELEMENTS = utils.ELEMENTS;

	observer = new MutationObserver(onPageChange);
	observer.observe(document.body, { childList: true, subtree: true });
};

async function onPageChange() {
	await utils.delay(100);
	console.log("---");
	console.log(thisUrl);
	console.log(window.location.href);

	if (thisUrl === undefined || window.location.href !== thisUrl) {
		thisUrl = window.location.href;

		main();
		console.log("onchange");
	};
};

console.log("LAODED",window.location.href);
init().then(main);