export const ELEMENTS = {
	"asda":{
		"lsiName":"co-product__anchor",
		"lsiWeight":"co-product__volume co-item__volume",
		"lsiPrice":"co-product__price",
		"lsiImage":"asda-img asda-image thumbnail__image",
		"lsResult":"co-item", //01/03/24 "co-item co-item--rest-in-shelf" -> "co-item"
		"resCont":"search-page-content__products-tab-content",

		"prodName":"pdp-main-details__title",
		"prodWeight":"pdp-main-details__weight",
		"prodPrice":"co-product__price pdp-main-details__price",
		"prodImage":"asda-image picture",//"asda-image-zoom__zoomed-image-container asda-image-zoom__zoomed-image-container--hide",

		"topBar":"top-menu",
		"aStyle":"font-weight: bolder;",
		"colour":"#efffd6",
		"boxStyle":"float: right; height: 20px; width: 20px; position: relative; z-index: 100;",

		"banned":[

		]
	},
	"morrisons":{
		"lsiName":"fop-title",
		"lsiWeight":"fop-catch-weight",
		"lsiPrice":"fop-price",
		"lsiImage":"fop-img",
		"lsResult":"fops-item fops-item--cluster",// 02/03/24 "fops-item fops-item" -> "--cluster",
		"resCont":"fops fops-regular fops-shelf",

		"prodName":"bop-title",
		"prodWeight":"bop-catchWeight",
		"prodPrice":"bop-price__current",
		"prodImage":"bop-gallery__image",

		"topBar":"hd-header__content",
		"aStyle":"font-size: 30px;margin-top: 10px;position: absolute;",
		"colour":"#fff5c0",
		"boxStyle":"float: right; height: 20px; width: 20px;margin-bottom: -20px;margin-right: 1px;margin-top: 1px;z-index: 100;position: relative;",

		"banned":[
			"recommended-fops"
		]
	}
};

export const MORRISONS = "groceries.morrisons";
export const ASDA = "groceries.asda";

export const MORRISONS_SEARCH = "https://groceries.morrisons.com/search?entry=";
export const ASDA_SEARCH = "https://groceries.asda.com/search/";

export const ALL_STORES = ["morrisons","asda"];
export const STORES_URLS = {
	"morrisons":"https://" + MORRISONS,
	"asda":"https://" + ASDA
};
export const STORES_BASES = {
	"morrisons":MORRISONS,
	"asda":ASDA
};

export const RESULTS_TO_LOAD = 10;

const weightReplaces = [["ml",""],["l",""],["g",""],["kg",""],["per pack","pk"],[" ",""]];

export function didSearchFail(doc) {
	let store = storeFromUrl(doc.location.href);

	if (store === "morrisons") {
		return doc.getElementsByClassName("nf-resourceNotFound").length > 0;
	} else if (store === "asda") {
		return doc.getElementsByClassName("search-page-content__no-result").length > 0;
	};
};

export function productUrl(id, store) {
	store = store.toLowerCase();

	if (store === "morrisons") {
		return "https://" + MORRISONS + ".com/products/" + id;
	} else if (store === "asda") {
		return "https://" + ASDA + ".com/product/" + id;
	};
};

export function storeFromUrl(url, upper=false) {
	let store;
	
	if (url.includes(MORRISONS)) {
		store = "morrisons"
	} else if (url.includes(ASDA)) {
		store = "asda"
	};

	if (!upper) { store = store.toLowerCase() };

	return store;
};

export function idFromUrl(url) {
	let id;

	if (url.includes(MORRISONS)) {
		id = url.match(/groceries.morrisons.com\/products\/.+?-(-{0}\d+)$/);
	} else if (url.includes(ASDA)) {
		id = url.match(/groceries.asda.com\/product\/.+?\/.+?\/(\d+)$/);
	};

	if (!id) { id = url.match(/\/(-{0}\d+)$/); };

	if (!id) { return };
	return id[1];
};

export function waitForElement(selector, orFail=false, doc=null) {
	return new Promise(resolve => {
		let found = document.querySelector(selector);
		if (found || (orFail == true && didSearchFail(doc))) { resolve(found) };

		const observer = new MutationObserver(changes => {
			let found = document.querySelector(selector);
			if (found || (orFail == true && didSearchFail(doc))) {observer.disconnect(); resolve(found)};
		});

		observer.observe(document.body, {childList:true, subtree:true});
	});
};

export function waitForEntries(cls) {
	return new Promise(resolve => {
		let found = document.getElementsByClassName(cls);
		if (found.length > 0) { resolve(found) };

		const observer = new MutationObserver(changes => {
			let found = document.getElementsByClassName(cls);
			if (found.length > 0) {observer.disconnect(); resolve(found)};
		});

		observer.observe(document.body, {childList:true, subtree:true});
	});
};

export function waitFor(i, e, orFail=false, doc=null) {
	return new Promise(resolve => {
		let found = i.getElementsByClassName(e);
		if (found.length > 0 || (orFail == true && didSearchFail(doc))) { resolve(found) };

		const observer = new MutationObserver(changes => {
			let found = i.getElementsByClassName(e);
			if (found.length > 0 || (orFail == true && didSearchFail(doc))) {observer.disconnect(); resolve(found)};
		});

		observer.observe(i, {childList:true, subtree:true});

		setTimeout(function() {
			observer.disconnect();
			resolve(null);
		}, 1000)
	});
};

export function waitForContent(i, e) {
	return new Promise(resolve => {
		let found = i.getElementsByClassName(e);
		if (found.length > 0 && found[0].innerText !== "") { resolve(found) };

		let checkInterval;

		setInterval(function() {
			found = i.getElementsByClassName(e);
			if (found.length > 0 && found[0].innerText !== "") {
				clearInterval(checkInterval);
				resolve(found);
			};
		}, 250);
	});
};

export function scrapeProductInfo(doc, store, url) {
	let name, weight, price, image;

	let elems = ELEMENTS[store];

	if (store === "asda") {
		name = doc.getElementsByClassName(elems.prodName)[0].innerText || ".";
		weight = doc.getElementsByClassName(elems.prodWeight)[0].innerText || ".";
		price = doc.getElementsByClassName(elems.prodPrice)[0].childNodes[1].data || ".";
		image = doc.getElementsByClassName(elems.prodImage)[0].firstChild.srcset || ".";
	} else if (store === "morrisons") {
		name = doc.getElementsByClassName(elems.prodName)[0].firstChild.firstChild.textContent || ".";
		price = doc.getElementsByClassName(elems.prodPrice)[0].lastChild.data || ".";
		image = doc.getElementsByClassName(elems.prodImage)[0].src || ".";
		let weightElem = doc.getElementsByClassName(elems.prodWeight)[0]
		
		if (weightElem) { weight = weightElem.innerText; } else { weight = "." };
	};

	return {
		"name":name,
		"weight":weight,
		"price":price,
		"imageUrl":biggerImg(image),
		"url":prettyUrl(url),
		"store":store
	};
};

export function scrapeListItemInfo(i, store) {
	let name, weight, price, image, url;
	let elems = ELEMENTS[store];

	if (store === "asda") {
		let nameElem = i.getElementsByClassName(elems.lsiName)[0];
		name = nameElem.innerText || ".";
		url = nameElem.href || ".";

		weight = i.getElementsByClassName(elems.lsiWeight)[0].innerText || ".";
		price = i.getElementsByClassName(elems.lsiPrice)[0].childNodes[1].data || ".";
		image = i.getElementsByClassName(elems.lsiImage)[0].currentSrc || ".";
		
	} else if (store === "morrisons") {
		let nameElem = i.getElementsByClassName(elems.lsiName)[0];
		name = nameElem.innerText || ".";
		url = nameElem.parentElement.parentElement.parentElement.href || ".";
		
		weight = i.getElementsByClassName(elems.lsiWeight)[0].innerText || ".";
		price = i.getElementsByClassName(elems.lsiPrice)[0].innerText || ".";
		image = i.getElementsByClassName(elems.lsiImage)[0].currentSrc || ".";
	};

	return {
		"name":name,
		"weight":weight,
		"price":price,
		"imageUrl":biggerImg(image),
		"url":url,
		"store":store
	};
}

export function delay(ms) {
	let start = Date.now();	

	return new Promise(resolve => {
		//while (Date.now() < start + ms) {};
		//resolve(Date.now());

		setTimeout(function() {
			resolve(Date.now());
		}, ms);
	});
};

export function matchWeights(w1,w2) {
	w1 = w1.toLowerCase();
	w2 = w2.toLowerCase();

	for (let i of weightReplaces) {
		w1 = w1.replaceAll(i[0],i[1]);
		w2 = w2.replaceAll(i[0],i[1]);
	};

	console.log(w1,w2);

	return w1 === w2;
};

export function prettyUrl(before) {
	if (before.includes("search")) { return before; };

	return productUrl(idFromUrl(before), storeFromUrl(before, false));
};

export function formatPrice(priceText) {
	let actual;

	if (typeof(priceText) === "number") { actual = priceText; }
	else { actual = priceInt(priceText); };

	if (actual > 100) {
		priceText = "£" + String(Math.floor(actual / 100));

		let remainder = actual % 100

		if (remainder === 0) {
			priceText += ".00"
		} else if (remainder < 10) {
			priceText += ".0" + String(remainder);
		} else {
			priceText += "." + String(remainder);
		};
	} else {
		priceText = String(actual) + "p";
	};

	/*if (priceText.includes("£") && !priceText.includes(".")) {
		priceText = priceText + ".00";
	};*/

	return priceText;
};

export function priceInt(priceText) {
	//return in PENCE.

	if (priceText.includes("p")) {
		priceText = priceText.replace("p","");
		return Number(priceText);
	} else {
		if (priceText.includes(".")) {
			return Number(priceText.replace("£","").replace(".",""));
		} else {
			return Number(priceText.replace("£",""))*100;
		};
	};
};

export function formatSearch(term) {
	console.log(term,typeof(term));

	term = term.toLowerCase();

	for (let s of ALL_STORES) {
		term = term.replaceAll(s.toLowerCase());
	};
	
	let str = "";

	for (let word of term.split(" ")) {
		str = str  + word + "%20";
	};

	return str;
};

export function getTodayStr() {
	const d = new Date();
	return `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`;
};

export async function cacheGet(key, giveStorage=false) {
	const storage = await storageGet();
	const dateKey = getTodayStr();

	if (!storage.cache || !storage.cache[dateKey]) {
		return new Promise(resolve => {
			if (giveStorage) {
				resolve([null, storage]);
			} else {
				resolve(null);
			};
		});
	};

	return new Promise(resolve => {
		if (giveStorage) {
			resolve([storage.cache[dateKey][key], storage]);
		} else {
			resolve(storage.cache[dateKey][key]);
		};
		
	});
};

export async function cacheSet(key, value, set=true) {
	const storage = await storageGet();
	const dateKey = getTodayStr();

	if (!storage.cache) { storage["cache"] = {} };
	
	if (!storage.cache[dateKey]) { 
		storage.cache = {}; //removing past caches. only will happen once a day.
		storage.cache[dateKey] = {};
	};

	if (typeof(key) === "object") {
		for (let [i,v] of Object.entries(key)) {
			storage.cache[dateKey][i] = v;
		};
	} else {
		storage.cache[dateKey][key] = value;
	};

	if (set === true) {
		await browser.storage.local.set(storage);
	};
	
	return new Promise(resolve => {resolve(storage)});
};

export function biggerImg(url) {
	if (url.includes("asda")) {
		if (!url.includes("?")) { url += "?" };

		if (url.includes("wid")) {
			url = url.replace(/wid=\d+/,"wid=640");

		} else {
			if (url.slice(-1) !== "&" && url.slice(-1) !== "?") { url += "&" };
			url += "wid=640";
		};

		if (url.includes("hei")) {
			url = url.replace(/hei=\d+/,"hei=640");

		} else {
			if (url.slice(-1) !== "&" && url.slice(-1) !== "?") { url += "&" };
			url += "hei=640";
		};

	} else if (url.includes("morrisons")) {
		url = url.replace(/_\d+x\d+./,"_640x640.")
	};

	return url;
};

export async function storageGet() {
	let storage = await browser.storage.local.get();

	console.log(storage);

	if (Object.keys(storage).length === 0) {
		storage = {
			"cache":{},
			"job":{},
			"lastTab":null,
			"lists":{},
			"matches":{}
		}
	};

	return storage;
};