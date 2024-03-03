const youSure = "I'm sure";

let storesDone = [];
let oneTimeTasksDone = false;
let resultObj;
let utils;
let interval;
let manualChooseInterval;

function getSelected() {
	const selected = [];
	let tot = 0;

	for (let i of document.getElementsByClassName("store")) {
		if (i.id === "store-template") { continue; };

		tot += 1

		let ul = i.getElementsByTagName("ul")[0];
		let unhidden = [];

		for (let j of ul.children) {
			if (j.style.display !== "none") { unhidden.push(j); };
			console.log(j);
		};

		console.log(unhidden);
		
		if (unhidden.length === 1) {
			selected.push(unhidden[0]);
		};
	};

	console.log(selected, tot)
	return [selected, tot];
};

async function actualConfirm() {
	const storage = await utils.storageGet();

	if (!storage.matches) { storage["matches"] = {} };

	let [selected, tot] = getSelected();
	let all = [];

	for (let i of selected) {
		let url = i.getElementsByClassName("prod-link")[0].href;
		let name = i.getElementsByClassName("prod-name")[0].innerText;
		let weight = i.getElementsByClassName("prod-weight")[0].innerText;

		all.push([utils.prettyUrl(url), name + " " + weight]);
	};

	console.log(JSON.stringify(all),"all")

	for (let i of all) {
		let others = [];

		for (let j of all) {
			if (j[0] !== i[0]) { others.push(j[0]) };
		};

		storage.matches[i[0]] = {"others": others, "name": i[1]};
	};

	storage.job = {};

	await browser.storage.local.set(storage);
	
	let msg = document.getElementById("confirm-message");

	await utils.delay(500);
	msg.textContent = "Complete!";
	await utils.delay(500);

	if (storage.lastTab) {
		browser.tabs.update(storage.lastTab.id, {active:true, highlighted:true});
		window.close();
	};
};

function onCheck(box, item, compare) {
	let displayOthers;

	if ( box.checked === true) { displayOthers = "none" } else { displayOthers = "inline-flex" };

	for (let i of document.getElementById(item.store+"-ul").children) {
		if (i.id !== box.parentElement.id) { i.style.display = displayOthers; };
	};

	for (let i of document.getElementsByClassName("store")) {
		if (i.id !== "store-template") {
			let cantFindBtn = i.getElementsByTagName("a")[0];
			if (cantFindBtn) { cantFindBtn.hidden = box.checked; };
		};
	};

	if (box.checked === true) {
		let [selected, tot] = getSelected();
		if (selected.length !== tot) { return; };

		let confirm = document.getElementById("match-confirm");
		confirm.style="display: block;";

		let btn = confirm.getElementsByTagName("button")[0];
		btn.textContent = "Confirm Match";


		btn.onclick = function() {
			if (btn.textContent === youSure) {
				actualConfirm();
			} else if (!utils.matchWeights(item.weight, compare.weight)) {
				let msg = document.getElementById("confirm-message");
				msg.style = "color: rgb(255,0,0)";
				msg.innerHTML = "The sizes of these items seem different.<br>Are you sure they match?";

				btn.textContent = youSure;
			} else {
				actualConfirm();
			};
		};


		let msg = confirm.getElementsByTagName("a")[0];
		msg.style = "";
		msg.innerHTML = "";

		document.body.append(confirm);

	} else {
		document.getElementById("match-confirm").style = "display: none;";
	};
};

async function startManualSearch(btn, link, compare) {
	const storage = await utils.storageGet();
	
	storage.job = {
		"info":{
			"bulk":[link],
			"type":"search",
			"searchMode":"free",
			"url":link,
			"weight":compare.weight
		},
		"got":{}
	};

	//let tab = await browser.tabs.query({currentWindow:true,active:true});
	//storage["lastTab"] = tab[0];
	//can't - content scripts cant access browser.tabs - could do background but cba

	await browser.storage.local.set(storage);
	
	async function onStorageChange(changes, area, link, compare) {
		if (area !== "local") { return; };
		if (changes.job.oldValue === changes.job.newValue) { return; };

		console.log("match.startManualSearch changes:", changes);

		let job = changes.job.newValue.got[link];

		if (job) {
			browser.storage.onChanged.removeListener(listener);

			const entry = createEntry(job, compare, true);
			document.getElementById(job.store + "-ul").append(entry);

			onCheck(entry.getElementsByTagName("input")[0], job, compare);

			const storage = await utils.storageGet();
			storage.job = {};
			await browser.storage.local.set(storage);
		};		
	};

	var listener = function(changes, area) {
		onStorageChange(changes, area, link, compare);
	};

	browser.storage.onChanged.addListener(listener);

	if (btn) {
		let tabId = btn.getAttribute("tabId");

		if (tabId) {
			try {
				browser.tabs.update(Number(tabId), {active:true, highlighted:true});
				return;
			} catch {};
		};
	
		browser.tabs.create({ url:link, active: true });
	};
};

function createEntry(item, compare, manually=false) {
	if (!item.name) { item["name"] = "failed"; };
	if (!item.price) { item["price"] = ""; };
	if (!item.weight) { item["weight"] = "."; };
	if (!item.imageUrl) { item["imageUrl"] = ""; };

	let entry = resultObj.cloneNode(true);
	let name = item.name;

	/*if (manually === true) {
		name = "* " + name + " *";
	};*/

	let weightObj = entry.getElementsByClassName("prod-weight")[0];

	if (compare === null || utils.matchWeights(item.weight, compare.weight)) {
		weightObj.style.fontWeight = "bold";
	};

	weightObj.innerText = item.weight;

	let nameElem = entry.getElementsByClassName("prod-name")[0];
	nameElem.innerText = name;
	if (manually === true) { nameElem.style.fontWeight = "bold"; };

	entry.getElementsByClassName("prod-price")[0].innerText = utils.formatPrice(item.price);
	entry.getElementsByClassName("prod-img")[0].src = item.imageUrl;

	let linkObj = entry.getElementsByClassName("prod-link")[0];
	linkObj.textContent = "Store Page";
	linkObj.href = item.url;

	let checkBox = entry.getElementsByTagName("input")[0];
	checkBox.addEventListener("click", function() { onCheck(checkBox, item, compare) })

	if (manually === true) {
		checkBox.checked = true;
	};

	if (compare === null) {
		checkBox.remove();
	};

	entry.hidden = false;
	entry.style.display = "inline-flex";
	entry.id = item.store + "-" + document.getElementById(item.store + "-ul").children.length;

	return entry;
};

function display(bulk, store1, link=undefined) {
	let info = bulk[0];

	let storeObj = document.getElementById("store-template").cloneNode(true);
	storeObj.id = info.store;
	storeObj.style.display = "inline-block"

	console.log(storeObj)
	let h2 = storeObj.firstElementChild;
	h2.textContent = info.store.toUpperCase();
	
	const ul = document.createElement("ul");
	ul.style = "display: inline-flex; margin-top: 0px; list-style-type:none; flex-direction: column;";
	ul.id = info.store + "-ul";

	const storeLink = storeObj.children[1];

	if (store1 !== null) {
		storeLink.addEventListener("click", function() { startManualSearch(storeLink, link, store1) })
		storeLink.hidden = false;
	} else {
		storeLink.remove();
	};

	document.body.append(storeObj);
	storeObj.append(ul);

	for (let item of bulk) {
		ul.append(createEntry(item, store1));
	};	

	return storeObj;
};


async function main() {
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
	const thisInfo = await utils.cacheGet(url);
	const toGet = [];
	const tabIds = {};

	const search = utils.formatSearch(thisInfo.name);

	for (let i of utils.ALL_STORES) {
		if (i === store) { continue; };

		toGet.push(utils[i.toUpperCase() + "_SEARCH"] + search);
	};

	storage.job = {
		"info":{
			"bulk":toGet,
			"type":"search",
			"searchMode":"scrape",
			"search":search
		},
		"got":{}
	};

	/*storage.job = {
		"info":{
			"bulk":toGet,
			"type":"search",
			"searchMode":"free-hybrid",
			"search":search,
			"weight":thisInfo.weight,
			"url":url
		},
		"got":{}
	};*/

	console.log("THSINFO", JSON.stringify(thisInfo));
	
	display([thisInfo], null);

	await browser.storage.local.set(storage);

	/*changes = 
	Object { cache: {…}, job: {…}, lists: {…}, matches: {…} }
		cache: Object { oldValue: {…}, newValue: {…} }
		job: Object { oldValue: {…}, newValue: {…} }
		lists: Object { oldValue: {…}, newValue: {…} }
		matches: Object { oldValue: {…}, newValue: {…} }*/
	async function onStorageChange(changes, area, thisInfo, info, store) {
		if (area !== "local") { return; };
		if (changes.job.oldValue === changes.job.newValue) { return; };

		console.log("match.main changes:", changes);

		let job = changes.job.newValue.got;

		for (let u of toGet) {
			console.log(JSON.stringify(job[u]));
			console.log(JSON.stringify(thisInfo));

			let store = utils.storeFromUrl(u, false);

			if (job[u]) {
				if (job[u][0] === "failed") {
					toGet.splice(toGet.indexOf(u), 1);
					break;
				};

				let storeObj = display(job[u], thisInfo, utils[store.toUpperCase() + "_SEARCH"] + info.search);
				toGet.splice(toGet.indexOf(u), 1);

				console.log("tabids", tabIds);

				let btn = storeObj.getElementsByTagName("a")[0];
				btn.setAttribute("tabId", tabIds[u]);
				console.log(btn.getAttribute("tabId"));
			};
		};

		if (toGet.length === 0) {
			browser.storage.onChanged.removeListener(listener);

			/*const storage = await utils.storageGet();
			storage.job = {};
			await browser.storage.local.set(storage);*/

			document.getElementById("loading").remove();

			for (let i of document.getElementsByClassName("result-box")) {
				i.disabled = false;
			};
		};
	};

	var listener = function(changes, area) {
		onStorageChange(changes, area, thisInfo, storage.job.info);
	};

	browser.storage.onChanged.addListener(listener);

	for (let u of toGet) {
		let tab = await browser.tabs.create({url:u, active: false});
		console.log(utils.storeFromUrl(u, false));

		//tabIds[u] = tab.id;
		//console.log("tabidss",tabIds);
		//await startManualSearch(null, u, thisInfo);
	};

	
};

async function init() {
	utils = await import(browser.runtime.getURL("../utils.js"));
	resultObj = document.getElementsByClassName("row-x")[0];
};

init().then(main);
