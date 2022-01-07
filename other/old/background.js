var loading_script = false;
var queue = [];

chrome.runtime.onInstalled.addListener( () => {
    console.log("installed!");
    
    const mainURL = chrome.runtime.getURL("main.html");   
    chrome.storage.sync.set({ mainURL });

    const dataURL = chrome.runtime.getURL("data.html");   
    chrome.storage.sync.set({ dataURL });

    // set Database
    //fetchLists("extension", "", "add");

    // MAIN LOADING
    queue = [];
    loading_script = false;

    chrome.storage.sync.get(null, (r) => {console.log(r);})
});

// ICON CLICKED
chrome.action.onClicked.addListener(async function() {
    console.log("click - loading", loading_script, queue)
    var [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true }); 
    
    if (loading_script == true) {
        queue.push(currentTab); 
    }
    else { 
        loading_script = true;
        chrome.storage.sync.set({ currentTab });  
        loading_script = main(currentTab) 
    } 
}); 

// MAIN LOADING
chrome.runtime.onMessage.addListener((request) => {
    if (request.message == "loading script") { loading_script = true }
    if (request.message == "script loaded") { 
        if (queue.length > 0) { 
            main(queue[0]);
            queue.shift();
        }
        else { loading_script = false }
    }
});

// MESSAGE from edit.js
chrome.runtime.onMessage.addListener(function listenToEdit(request) {
    if (request.message == "update lists") {
        console.log("update lists")
        var url = request.content[0], lists = request.content[1]
        //fetchLists(url, lists, 'discard');
    }
    if (request.message == "update titles") {
        console.log("update")
        var url = request.content[0], lists = request.content[1], section = request.content[2]
        //fetchLists(url, title, 'titles');
    }
});  



//////  FUNCTIONS  //////
function main(currentTab) {
    var loading_page = true;
    chrome.alarms.create("loading", {when: Date.now() + 750});
    //chrome.alarms.onAlarm.addListener(() => { if (loading_page == true) { loading(currentTab.id, "load") }})

    chrome.storage.sync.get("pageList", (data) => {
        let pageList = data.pageList || [];
        // NEW PAGE
        if (!pageList.includes(currentTab.url)) {             
            pageList.push(currentTab.url); 
            getRecipe(currentTab.id);
            
            chrome.runtime.onMessage.addListener(function messageFromPage(request, sender, sendResponse) {
                if (request.message == "your dinner is ready") {
                    chrome.alarms.clear("loading")
                    if (loading_page == true) { 
                        loading(currentTab.id, "loaded")
                        loading_page = false;
                    }
                    sendResponse("2 -- BACKGROUND");
                    chrome.storage.local.get("stringsToSend", (strings) => { // { ingredients, not_ingredients, method, not_method, text }
                        chrome.storage.sync.get("currentTab", (data) => {
                            //fetchLists(data.currentTab.url, strings.stringsToSend, 'add');
                            chrome.storage.sync.set({ lastURL: currentTab.url });
                            chrome.storage.sync.set({ pageList });
                            getMainTab(data.currentTab.index);
                        });
                    });
                }
                if (request.message == "no matches") { 
                    chrome.alarms.clear("loading")
                    if (loading_page == true) { 
                        loading(currentTab.id, "loaded")
                        loading_page = false;
                    }
                    return false;
                }
                chrome.runtime.onMessage.removeListener(messageFromPage);
            });  
        }
        // PAGE in PAGELIST
        else { 
            chrome.storage.sync.set({ lastURL: currentTab.url })
            getMainTab(currentTab.index);     
            load = false; 
        }
    });
}

function loading(tabId, request) {
    if (request == "load") {
        console.log("PAGE loading...........")
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: waitingToLoad
        });
    }
    if (request == "loaded") {
        console.log("...........PAGE loaded")
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: doneLoading
        });
    }

    function waitingToLoad() {
        document.body.insertAdjacentHTML("afterbegin", `<div id="loading-filter" style="width: 105%; height: 105%; 
        opacity: 0.75; filter: alpha(opacity=75); background-color: red; position: fixed; z-index:500"></div>
        <div id="loading-block" style="position: fixed; z-index: 1000; margin: 20px; background-color: white; 
        width: 300px; height: 80px; top:30%; left: 50%; right: 50%; transform: translate(-50%, -50%); padding: 20px;
        font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif; font-size: large;">
        <div class="d-flex align-items-center">
        <strong>Preparing your recipe... &nbsp;&nbsp;&nbsp;</strong>
        <div class="spinner-border ms-auto" role="status" aria-hidden="true" style="z-index: 1000"></div></div></div>`);
    }

    function doneLoading() {
        if (loading_block = document.getElementById("loading-block")) { 
            loading_block.style.display = "none" 
        }
    }
}

function getRecipe(tabId) {
    chrome.tabs.update(tabId, {active: true});
    chrome.scripting.executeScript({     
        target: { tabId: tabId },
        files: ["page.js"]
    });
}

function getMainTab(index) {
    chrome.storage.sync.get("mainURL", (data) => {    
        chrome.tabs.query({ url: data.mainURL }).then( mainTab => {
            if (mainTab.length > 0) {   // MAIN Tab found
                chrome.tabs.reload(mainTab[0].id, {bypassCache: true}).then( () => {
                    chrome.tabs.update(mainTab[0].id, {active: true})
                });
            }
            else {                      // MAIN Tab not found
                chrome.tabs.create({ url : data.mainURL, active: true, index: index+1 }, newTab => {   
                    chrome.storage.sync.set({ mainTabId: newTab.id });
                });
            }
        });
    });   
}

function fetchLists(url, lists, route, section=undefined) {   // fetch to and from Django in App
    
    console.log("FETCH: " + route)
    //console.log(lists)

    fetch(`http://127.0.0.1:8000/words/${route}`, {
        method: "POST",
        body: JSON.stringify([url, lists, section]),
        credentials: "include",
    }).then(response => {
        if (!response.ok) { throw new Error(response.statusText) }
        return response.json();
    }).then(data => {     
        if (data != "updated!") { chrome.storage.local.set({ 
            Database: {
                ingredients: data["ingredients repeated"].sort(),
                not_ingredients: data["not-ingredients repeated"].sort(),
                method: data["method repeated"].sort(),
                not_method: data["not-method repeated"].sort(),
                not_method_first: data["not-method first repeated"].sort(),
                sources: data["sources"],
                stats: data["stats"],
                title_ingredients: data['title_ingredients'],
            }
        })}
    }).catch(error => { console.error('There has been a problem with your fetch operation:', error) });
}