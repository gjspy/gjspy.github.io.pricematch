let storesDone = [];
let oneTimeTasksDone = false;
let resultObj;
let utils;
let interval;
let itemsLoading = 0;

/*function updateTots() {
	for (let i of document.getElementsByClassName("store-ul")) {
		let price = 0;

		for (let r of i.children) {
			let priceText = r.getElementsByClassName("grand-tot")[0].textContent || r.getElementsByClassName("prod-price")[0].textContent;
			price += utils.priceInt(priceText);
		};

		price = String(price/100);
		if (price.includes(".") && price.slice(price.indexOf(".")).length !== 3) { price += "0"	};
		i.parentElement.getElementsByClassName("ult-tot")[0].textContent = "£" + price;//"£" + price.slice(0,-2) + "." + price.slice(-2);
	};
};*/

function typing(ev, row) {
	let chpElem, chpPrice, expElem, expPrice;
	let tots = {};

	for (let i of document.getElementsByClassName("row-"+row)) {
		const thisPrice = utils.priceInt(i.getElementsByClassName("prod-price")[0].textContent) * ev.target.value;
		let priceStr = utils.formatPrice(thisPrice);//String(thisPrice/100);

		//if (priceStr.includes(".") && priceStr.slice(priceStr.indexOf(".")).length !== 3) { priceStr += "0"	};

		i.getElementsByTagName("input")[0].value = ev.target.value;
		i.getElementsByClassName("grand-tot")[0].textContent = priceStr;//"£" + priceStr.slice(0,-2) + "." + priceStr.slice(-2);
		i.getElementsByClassName("saving")[0].textContent = "";

		if (!tots[i.parentElement.id]) { tots[i.parentElement.id] = 0 };
		tots[i.parentElement.id] += thisPrice;

		if (chpPrice === thisPrice) {
			chpElem = undefined;
			chpPrice = undefined;
			expElem = undefined;
			expPrice = undefined;

		} else if (chpPrice === undefined || thisPrice < chpPrice) {
			expElem = chpElem;
			expPrice = chpPrice;

			chpElem = i;
			chpPrice = thisPrice;			
		} else {
			expElem = i;
			expPrice = thisPrice;
		};
	};

	console.log(chpPrice,chpElem,expPrice);
	if (chpPrice && chpElem && expPrice) {
		const diff = expPrice-chpPrice;
		let priceStr = utils.formatPrice(diff);

		//if (priceStr.includes(".") && priceStr.slice(priceStr.indexOf(".")).length !== 3) { priceStr += "0"	};
		chpElem.getElementsByClassName("saving")[0].textContent = "(-" + priceStr + ")"; //"(-" + priceStr.slice(0,-2) + "." + priceStr.slice(-2) + ")";
	};

	//updateTots();

	let cheapestElems, price, greatestPrice;

	for (let i of document.getElementsByClassName("store-ul")) {
		if (price === tots[i.id]) {
			cheapestElems.push(i);
		} else if (price === undefined || tots[i.id] < price) {
			cheapestElems = [i];
			price = tots[i.id];
		};

		if (greatestPrice === undefined || tots[i.id] > greatestPrice) { greatestPrice = tots[i.id]; };
	};

	for (let i of document.getElementsByClassName("store-ul")) {
		const t = i.parentElement.getElementsByClassName("ult-tot")[0];

		let diffStr = "";

		if (cheapestElems && cheapestElems.length !== utils.ALL_STORES.length) { 
			diff = greatestPrice - tots[i.id];
			console.log(tots[i.id], diff);
			if (diff !== 0) { diffStr = " (-" + utils.formatPrice(diff) + ")"; t.style.fontWeight = "bold"; }
			else {t.style.fontWeight = "normal"; };
			
		};
		
		t.textContent = "Total: " + utils.formatPrice(tots[i.id]) + diffStr;

	};
};

async function remove(row) {
	const name = document.title;

	let urls = [];

	console.log(document.getElementsByClassName("row-"+row));
	for (let i of Array.from(document.getElementsByClassName("row-"+row)).values()) {
		console.log(i);
		urls.push(i.getElementsByClassName("prod-link")[0].href);
		i.remove();
	};

	const storage = await utils.storageGet();
	console.log(urls);

	for (let u of urls) {
		if (storage.lists[name].includes(u)) {
			storage.lists[name].splice(storage.lists[name].indexOf(u),1);
		};
	};

	await browser.storage.local.set(storage);


};

function createTempEntry(url, row) {
	let c = resultObj.cloneNode(true);

	c.getElementsByClassName("prod-name")[0].innerText = "LOADING";
	c.getElementsByClassName("prod-weight")[0].innerText = "LOADING";
	c.getElementsByClassName("prod-link")[0].text = url;
	c.getElementsByClassName("prod-img")[0].src = "";
	c.hidden = false;
	c.setAttribute("class", "row-"+row);
	c.style = "width: 100%; display: inline-flex;"

	c.getElementsByTagName("input")[0].addEventListener("input", function(ev) { typing(ev, row)});
	c.getElementsByClassName("remove")[0].addEventListener("click", function() { remove(row) });

	return c;
};

function createStoreDiv(name) {
	const store = document.getElementById("store-template").cloneNode(true);
	store.id = name;
	store.style.display = "inline-flex";

	const h2 = store.children[0].children[0];
	h2.textContent = name.toUpperCase();
	h2.style = "display: inline; margin-left: 40px;";

	let tot = store.getElementsByTagName("ul")[0]
	tot.id = name + "-ul";
	tot.setAttribute("class","store-ul");

	document.body.append(store);
	return store;
};

async function populateEntry(elem, url) {
	itemsLoading += 1
	let interval;
	let done;

	async function populate() {
		let [cached,storage]= await utils.cacheGet(url, true);

		if (!cached) {
			try {
				cached = storage.job.got[url];
			} catch {};
		};

		if (cached) {
			if (interval) { clearInterval(interval); };
			done = true;

			itemsLoading -= 1
			console.log(cached);

			elem.getElementsByClassName("prod-name")[0].innerText = cached.name;
			elem.getElementsByClassName("prod-weight")[0].innerText = cached.weight;
			elem.getElementsByClassName("prod-price")[0].innerText = utils.formatPrice(cached.price);
			elem.getElementsByClassName("prod-img")[0].src = cached.imageUrl;

			let link = elem.getElementsByClassName("prod-link")[0];
			link.innerText = "Store Page";
			link.href = cached.url;
		};
	};

	await populate()

	if (done !== true) {
		interval = setInterval(populate, 500);
	};
};

function onceLoaded() {
	let tots = {};

	for (let i of Array(document.getElementsByClassName("store-ul")[0].children.length).keys()) {
		let cheapestElems, price;
		console.log(i);

		for (let r of document.getElementsByClassName("row-"+i)) {
			let thisPrice = utils.priceInt(r.getElementsByClassName("prod-price")[0].innerText);
			console.log(thisPrice);

			if (!tots[r.parentElement.id]) { tots[r.parentElement.id] = 0 };
			tots[r.parentElement.id] += thisPrice;

			if (price === thisPrice) {
				cheapestElems.push(r);
			} else if (price === undefined || thisPrice < price) {
				cheapestElems = [r];
				price = thisPrice;
			};
		};

		if (cheapestElems && cheapestElems.length !== utils.ALL_STORES.length) { 
			for (let e of cheapestElems) {
				e.style["font-weight"] = "bold" 
			};
		};
		//cheapestElem.innerHTML = "<b>" + cheapestElem.innerHTML + "</b>";
	};

	console.log(tots);

	let cheapestElems, price, greatestPrice;

	for (let i of document.getElementsByClassName("store-ul")) {
		if (price === tots[i.id]) {
			cheapestElems.push(i);
		} else if (price === undefined || tots[i.id] < price) {
			cheapestElems = [i];
			price = tots[i.id];
		};

		if (greatestPrice === undefined || tots[i.id] > greatestPrice) { greatestPrice = tots[i.id]; };
	};

	for (let i of document.getElementsByClassName("store-ul")) {
		const t = i.parentElement.getElementsByClassName("ult-tot")[0];

		let diffStr = "";

		if (cheapestElems && cheapestElems.length !== utils.ALL_STORES.length) { 
			diff = greatestPrice - tots[i.id];
			console.log(tots[i.id], diff);
			if (diff !== 0) { diffStr = " (-" + utils.formatPrice(diff) + ")"; t.style.fontWeight = "bold"; };
			
		};
		
		t.textContent = "Total: " + utils.formatPrice(tots[i.id]) + diffStr;

	};

	
};

async function displayList(listName) {
	const storage = await utils.storageGet();
	const list = storage.lists[listName];

	const stores = [];

	for (let i of Object.keys(utils.STORES_URLS)) {
		console.log(i);
		stores.push(createStoreDiv(i));
	};

	const toGather = [];
	let row = 0;

	let missing = [];

	for (let i of list) {
		let thisStore;
		let url;

		let id = utils.idFromUrl(i);//i.match(/(\d+)/)[1];

		for (let [n,u] of Object.entries(utils.STORES_URLS)) {
			if (i.includes(u)) {
				thisStore = document.getElementById(n+"-ul");
				url = utils.productUrl(id, n);
				break;
			};
		};

		let entry = createTempEntry(i,row);
		thisStore.append(entry);

		if (!await utils.cacheGet(i)) {
			toGather.push(i);
		};

		let matches = storage.matches[i];
		if (!matches) {
			missing.push(url);

			/*for (let [n,u] of Object.entries(utils.STORES_URLS)) {
				document.getElementById(n+"-ul").append(createTempEntry("??", row));
			};

			row += 1;

			continue;*/
			break; //would load all rows then bulk open match pages, but storage.job only supports one job at a time.
		}; //TODO: WAIT UNTIL MATCH MADE?

		entry.getElementsByClassName("prod-name")[0].textContent = matches.name;
		await populateEntry(entry, i);
		matches = matches;

		for (let m of matches.others) {
			let store;

			if (m.includes(utils.MORRISONS)) {
				store = document.getElementById("morrisons-ul");
			} else if (m.includes(utils.ASDA)) {
				store = document.getElementById("asda-ul");
			};

			entry = createTempEntry(m, row);
			store.append(entry);

			if (storage.matches[m]) {
				entry.getElementsByClassName("prod-name")[0].innerText = storage.matches[m].name;
			};

			await populateEntry(entry,m);

			if (!await utils.cacheGet(m)) {
				toGather.push(m);
			};
		};

		row += 1;
	};

	if (missing.length > 0) {
		let tab = await browser.tabs.query({currentWindow:true,active:true});
		const storage = await utils.storageGet();
		storage["lastTab"] = tab[0];
		await browser.storage.local.set(storage);

		window.alert("This list has unmatched items.\nOpening in new tabs now..");

		for (let i of missing) {
			let store = utils.storeFromUrl(i, false);
			let id = utils.idFromUrl(i);

			await utils.delay(100); //TODO: this is the laziest fix ever - shame on you!!
			//really need storage locking when writing from multiple sources.
			browser.tabs.create({url:"/pages/match/index.html?" + store + "=" + id, active: true});
		};

		window.addEventListener("focus", function() { window.location.reload(); });

		return;
	};

	if (toGather.length > 0) {
		console.log(toGather);

		storage.job = {
			"info":{
				"bulk":toGather,
				"type":"product"
			},
			"got":{}
		};

		await browser.storage.local.set(storage);

		for (let i of toGather) {
			browser.tabs.create({url:i, active: false});
		};

		let waiting = setInterval(async function() {
			console.log(itemsLoading);
	
			if (itemsLoading === 0) {
				clearInterval(waiting);

				const storage = await utils.storageGet();
				storage.job = {};
				await browser.storage.local.set(storage);

				onceLoaded();
				console.log("finsihed everythng!");
			};
		}, 500);
	} else {
		console.log("hellasdasdfasdfo");
		onceLoaded();
	};	
};

async function deleteList() {
	const storage = await utils.storageGet();

	delete storage.lists[document.title];

	await browser.storage.local.set(storage);
	window.close();
};

function rename() {
	const box = document.createElement("input");
	box.style = "vertical-align: middle;margin-left: 10px;";

	box.addEventListener("keydown", async function(ev) {
		if (ev.key === "Enter") {
			const storage = await utils.storageGet();

			if (storage.lists[box.value] || box.value === "") {
				document.getElementById("header").textContent = "Bad Name!";
				return;
			};
			storage.lists[box.value] = storage.lists[document.title];
			delete storage.lists[document.title];

			await browser.storage.local.set(storage);

			window.location.assign("/pages/listview/index.html?list="+box.value);
		};
	});

	document.getElementById("header").insertAdjacentElement("beforeend",box);
};

async function init() {
	utils = await import(browser.runtime.getURL("../utils.js"));
	console.log(utils.ASDA_SEARCH);

	resultObj = document.getElementsByClassName("row-x")[0];
};

init().then(async function() {
	const params = new URLSearchParams(document.location.search);
	const name = params.get("list");

	document.title =  name;
	document.getElementById("header").textContent = name;

	await displayList(name);

	document.getElementById("del").addEventListener("click", deleteList);
	document.getElementById("rn").addEventListener("click", rename);
});

/*<div id="store-1" class="store" style="display: inline-block; vertical-align: top;">
		<u class="store-title">
		<h2 style="display: inline"></h2>
	</u>
	<br>
</div> */