let pick = document.getElementById("pick_btn");
pick.addEventListener("click", async function() {
    let error_div = document.getElementById("error");
    let buttons = document.getElementById("buttons");
    var loading = document.getElementById("loading-block");

    const [pageTab] = await chrome.tabs.query({ active: true, currentWindow: true });  
    chrome.storage.local.set({ pageTab });  

    if (pageTab.url.startsWith("chrome")) { 
        error_div.style.display ="block";
        buttons.style.display ="none";
        throw new Error("cannot access a chrome:// URL")
    }

    var load = true;
    chrome.alarms.create("loading", {when: Date.now() + 750});
    chrome.alarms.onAlarm.addListener(() => { 
        if (load == true) { loading.style.display="block"; buttons.style.display ="none" }
    });

    chrome.storage.local.get("pageList", async (data) => {
        let pageList = data.pageList || [];
        if (!pageList.includes(pageTab.url)) {     // PAGE not in List
            pageList.push(pageTab.url); 
            chrome.storage.local.set({ pageList });
            getRecipe(pageTab.id);
        }
        else { getMainTab(pageTab.index) }         // PAGE in List
    });

    // on message from page.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message == "your dinner is ready") {
            load = false;
            sendResponse("2 -- BACKGROUND");
            chrome.storage.local.get("stringsToSend", (strings) => {
                chrome.storage.local.get("pageTab", (data) => {
                    chrome.storage.local.set({ lastURL: pageTab.url });
                    getMainTab(data.pageTab.index);
                    sendLists(data.pageTab.url, strings.stringsToSend);
                });
            });
        }
    });  
});

//////  FUNCTIONS  //////
function getRecipe(tabId) {
    chrome.tabs.update(tabId, {active: true});
    chrome.scripting.executeScript({     
        target: { tabId: tabId },
        files: ["page.js"]
    });
}

function getMainTab(index) {
    chrome.storage.local.get("mainURL", (data) => {    
        const mainTab = chrome.tabs.query({ url: data.mainURL }).then( mainTab => {
            if (mainTab.length > 0) {   // MAIN Tab found
                chrome.tabs.reload(mainTab[0].id, {bypassCache: true}).then( () => {
                    chrome.tabs.update(mainTab[0].id, {active: true})
                });
            }
            else {                      // MAIN Tab not found
                chrome.tabs.create({ url : data.mainURL, active: true, index: index+1 }, newTab => {   
                    chrome.storage.local.set({ mainTabId: newTab.id });
                });
            }
        });
    });   
}
