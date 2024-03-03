import { formatSearch, MORRISONS, ASDA, MORRISONS_SEARCH, ASDA_SEARCH, prettyUrl } from "../utils.js"

const SEARCH_MATCH = "//(.+).com/"

/*TODO: asda bundles, offers, star product star products?
show if the price is an offer!!! on comparison page
use offers to calculate better prices!!
use strict

******when url changed prompt rematch********
similar results
import json
*/

let utils;

console.log("hello there");

async function assertProductPage() {
	let tabs = await browser.tabs.query({currentWindow:true,active:true});

	let raw_url = tabs[0].url;
	let url = raw_url.match(SEARCH_MATCH);
	console.log(url);

	if ((url === null) || (!Object.values(utils.STORES_BASES).includes(url[1]))) {
		document.getElementById("error").textContent = "I don't recognise this URL.";
		return [false, tabs, raw_url, url];
	};

	url = url[1];

	if (!tabs[0].url.match("product")) { // if is a product page
		document.getElementById("error").innerHTML = "This doesn't seem like a product page!<br>You must be on an individual product's page to use this.";
		return [false, tabs, raw_url, url];
	};

	console.log(true, tabs, raw_url, url);
	return [true, tabs, raw_url, url];
};

function nagComparePage() {
	let interval = setInterval(async function() {
		try {
			var resp = await browser.runtime.sendMessage({
				"type": "popup->compare data"//"me is popup i want data"
			});
		} catch {
			clearInterval(interval);
		};

		console.log("resp", JSON.stringify(resp));

		if (!resp || !resp.response) {
			return;
		} else if (resp.response === "matching") {
			clearInterval(interval);
		} else if (typeof(resp.response) === "object") {
			document.getElementById("header").innerText = "Price Match";
			document.getElementById("main-btns").style.display = "none";
			document.getElementById("debug-cont").style.display = "none";
			document.getElementById("lists").innerHTML = "";
			document.getElementById("go-back").hidden = true;
	
			document.getElementById("cmp-info").style.display = "flex";
			document.getElementById("cmp-prices").style.display = "inline-flex";
	
			document.getElementById("header").style.textAlign = "right";

			let product = resp.response.product;
			let stores = resp.response.stores;
	
			document.getElementById("prod-name").innerText = product.name;
			document.getElementById("prod-weight").innerText = product.weight;
			document.getElementById("prod-img").src = product.imageUrl;

			stores[product.store] = product;

			let cheapestPrice;
			let cheapestStores;
	
			for (let [s,i] of Object.entries(stores)) {
				document.getElementById(s).getElementsByClassName("prod-price")[0].innerText = utils.formatPrice(i.price);

				let priceInt = utils.priceInt(i.price);

				if (cheapestPrice === undefined || cheapestPrice > priceInt) {
					cheapestStores = [s];
					cheapestPrice = priceInt;
				} else if (cheapestPrice === priceInt) {
					cheapestStores.push(s);
				}
			};

			if (cheapestStores.length > 0) {
				for (let s of cheapestStores) {
					document.getElementById(s).style.fontWeight = "bold";
				};
			};

			clearInterval(interval);
		} else {
			// pls wait, so pass
		};
	}, 500);
};

async function mainCompare(event, forceMatch=false) {
	let [isProduct, tabs, raw_url, url] = await assertProductPage();
	if (!isProduct) { return };

	const store = utils.storeFromUrl(raw_url);

	//is a pain to get info in here, now we cache every page
	//we visit so we have info before "compare" pressed

	console.log(raw_url,"popup.mainCOmpare")
	let id = utils.idFromUrl(raw_url);//raw_url.match(/(\d+)/)[1];

	const storage = await utils.storageGet();
	storage["lastTab"] = tabs[0];
	await browser.storage.local.set(storage);

	document.getElementById("error").innerText = "Working!"
	
	browser.tabs.create({
		url:"/pages/compare/index.html?" + store + "=" + id + "&forceMatch=" + String(forceMatch),
		active: false
	});

	nagComparePage();
};

/*async function onCompareMsg(request, sender, response) {
	console.log(request);
	console.log(sender);

	return new Promise((resolve) => {
		document.getElementById("header").innerText = "Price Match";
		document.getElementById("main-btns").style.display = "none";
		document.getElementById("debug-cont").style.display = "none";
		document.getElementById("lists").innerHTML = "";
		document.getElementById("go-back").hidden = true;

		document.getElementById("cmp-info").hidden = false;
		document.getElementById("cmp-prices").style.display = "inline-flex";

		let product = request.product;
		let stores = request.stores;

		document.getElementById("prod-name").innerText = product.name;
		document.getElementById("prod-weight").innerText = product.weight;
		document.getElementById("prod-img").src = product.imageUrl;

		for (let [s,i] of Object.entries(stores)) {
			document.getElementById(s).getElementsByClassName("prod-price")[0].innerText = i.price;
		};

		resolve({ response: 200 });
	});
};*/

async function clearMatches() {
	let confirm = document.createElement("button");
	confirm.innerText = "Confirm Clearing Matches";
	confirm.style.gridColumn = "1 / 5"
	confirm.addEventListener("click", async function() {
		let s = await utils.storageGet();
		s.matches = {};
	
		await browser.storage.local.set(s);
		confirm.remove();
	});

	document.getElementById("debug-cont").appendChild(confirm);
};

async function dump() {
	const blob = new Blob([JSON.stringify(await utils.storageGet())], {type:"application/json"});
	browser.tabs.create({url:URL.createObjectURL(blob)});
};

function openDebug() {
	const div = document.getElementById("debug-cont");
	let display;

	if (div.style.display === "none" || div.style.display === "") { display = "grid"; } else { display = "none"; };
	div.style.display = display;
};

async function clearCache() {
	console.log("clearing cache");
	const storage = await utils.storageGet();
	storage.cache = {};
	await browser.storage.local.set(storage);
};

async function clearJob() {
	console.log("clearing job");
	const storage = await utils.storageGet();
	storage.job = {};
	await browser.storage.local.set(storage);
};

async function clearStorage() {
	let confirm = document.createElement("button");
	confirm.innerText = "Confirm Clearing Storage";
	confirm.style.gridColumn = "1 / 5"
	confirm.addEventListener("click", async function() {
		await dump();
		await browser.storage.local.clear();
		console.log("cleared all storage");
	});

	document.getElementById("debug-cont").appendChild(confirm);
};

function goBack() {
	document.getElementById("header").innerText = "Price Match";
	document.getElementById("main-btns").style.display = "flex";
	document.getElementById("debug-cont").style.display = "none";
	document.getElementById("lists").innerHTML = "";
	document.getElementById("go-back").hidden = true;

	document.getElementById("cmp-info").hidden = true;
	document.getElementById("cmp-prices").style.display = "none";
};

async function changeList(list, box, clickedText, thisUrl) {
	if (clickedText) { box.checked = !box.checked };

	const storage = await utils.storageGet();
	console.log(list);
	const thisList = storage.lists[list]
	
	if (box.checked === true) {
		thisList.push(thisUrl);
	} else {
		thisList.splice(thisList.indexOf(thisUrl), 1);
	};

	await browser.storage.local.set(storage);
};

async function createList(name, item) {
	const storage = await utils.storageGet();
	if (!storage.lists) {storage.lists = {}};

	storage.lists[name] = [item];
	await browser.storage.local.set(storage);
};

async function showListsForAdd() {
	let [isProduct, tabs, raw_url, url] = await assertProductPage();

	if (!isProduct) { return };

	const storage = await utils.storageGet();

	document.getElementById("header").innerText = "Add To List";
	document.getElementById("main-btns").style.display = "none";
	document.getElementById("debug-cont").style.display = "none";
	document.getElementById("go-back").hidden = false;

	function createLi(name, thisUrl, checked) {
		const li = document.createElement("li");
		li.style = "list-style-type: none;"

		const box = document.createElement("input");
		box.type = "checkbox";
		box.addEventListener("click", function() {changeList(name, box, false, thisUrl)});
		box.checked = checked;

		const txt = document.createElement("a");
		txt.textContent = name;
		txt.style = "cursor: pointer;"
		txt.addEventListener("click", function() {changeList(name, box, true, thisUrl)});

		li.append(box, txt);
		return li;
	};

	const thisUrl = utils.prettyUrl(raw_url);
	
	if (storage.lists) {
		for (let i of Object.keys(storage.lists)) {
			console.log("i",i)
			let checked = false;

			if (storage.lists[i].includes(thisUrl)) { checked = true };

			if (storage.matches[thisUrl]) {
				for (let m of storage.matches[thisUrl].others) {
					if (storage.lists[i].includes(m)) { checked = true; break };
				};
			};

			
			document.getElementById("lists").append(createLi(i, thisUrl, checked));
		};
	};

	const li = document.createElement("li");
	li.style = "list-style-type: none;"

	const txt = document.createElement("a");
	txt.textContent = " + ";

	const input = document.createElement("input");
	input.type = "text";
	input.style = "width: 70px";
	input.placeholder = "New List";

	input.addEventListener("keydown", function(ev) {
		if (ev.key === "Enter") { 
			createList(input.value, thisUrl);
			document.getElementById("lists").append(createLi(input.value, thisUrl, true));

			goBack();
			//showListsForAdd();
		};
	});

	li.append(txt, input);
	document.getElementById("lists").append(li);
};

async function showListsForView() {
	const storage = await utils.storageGet();

	document.getElementById("header").innerText = "View List";
	document.getElementById("main-btns").style.display = "none";
	document.getElementById("debug-cont").style.display = "none";
	document.getElementById("go-back").hidden = false;

	for (let i of Object.keys(storage.lists)) {
		const li = document.createElement("li");

		const txt = document.createElement("a");
		txt.textContent = i;
		txt.style = "color: blue; text-decoration: underline; cursor: pointer;"
		txt.addEventListener("click", function() { browser.tabs.create({url: "/pages/listview/index.html?list=" + i})});

		li.append(txt);
		document.getElementById("lists").append(li);
	};
};

async function usage() {
	let storage = await utils.storageGet();
	let tot_txt = JSON.stringify(storage);
	let cache_txt = JSON.stringify(storage.cache);
	let match_txt = JSON.stringify(storage.matches);
	
	let tot_byts = tot_txt.length;
	let cache_byts = cache_txt.length;
	let match_byts = match_txt.length;

	function getTxt(bytes) {
		let txt;

		if (bytes > 1_000_000) {
			txt = String(Math.floor(bytes/1_000_0)/100) + "MB";
		} else if (bytes > 1_000) {
			txt = String(Math.floor(bytes/10)/100) + "KB";
		} else {
			txt = bytes + "B";
		};

		return txt;
	};

	let txt = `Total Usage: ${getTxt(tot_byts)}<br>Cache: ${getTxt(cache_byts)}<br>Matches: ${getTxt(match_byts)}`;

	document.getElementById("error").innerHTML = txt;
	console.log(txt);
};

async function importStorage() {
	console.log("hi")
	const file = this.files[0];
	console.log(file);
	const text = await file.text();
	console.log(text);
	const data = JSON.parse(text);
	console.log(data);

	await browser.storage.local.set(data);
};

async function init() {
	utils = await import(browser.runtime.getURL("../utils.js"));
};

init().then(() => {
	document.getElementById("compare").addEventListener("click", mainCompare);
	document.getElementById("vfy-match").addEventListener("click", (event) => {mainCompare(event, true)});
	document.getElementById("clr-matches").addEventListener("click", clearMatches);
	document.getElementById("clr-job").addEventListener("click", clearJob);
	document.getElementById("clr-cache").addEventListener("click", clearCache);
	document.getElementById("clr-strg").addEventListener("click", clearStorage);
	document.getElementById("dmp").addEventListener("click", dump);
	document.getElementById("debug").addEventListener("click", openDebug);
	document.getElementById("add-list").addEventListener("click", showListsForAdd);
	document.getElementById("view-list").addEventListener("click", showListsForView);
	document.getElementById("go-back").addEventListener("click", goBack);
	document.getElementById("shw-usg").addEventListener("click", usage);
	//document.getElementById("import").addEventListener("change", importStorage, false);
	//document.getElementById("importBtn").addEventListener("click", function() { document.getElementById('import').click(); });
	
	//browser.runtime.onMessage.addListener(onCompareMsg);
});