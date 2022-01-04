// reset STORAGE
document.getElementById("edit-reset").addEventListener("click", () => {
    
    // clear STORAGE
    chrome.storage.local.clear(function() {
        var error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        }
        else {
            console.log("Local Storage reset")
        }
    });
    chrome.storage.sync.clear(function() {
        var error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        }
        else {
            console.log("Sync Storage reset")
        }
    });

    // create URL for MAIN
    const mainURL = chrome.runtime.getURL("main.html");   
    chrome.storage.sync.set({ mainURL });
    chrome.tabs.update({url: mainURL});
});

// SAVE URL
document.getElementById("url-btn").addEventListener("click", (clicked) => {
    chrome.storage.sync.get("boris_list", (b) => {
        chrome.storage.sync.get("lastURL", (url) => {
            const save = document.getElementById("save-url")
            let this_url = save.value;
            if (this_url.length == 0) { this_url = url.lastURL }

            let boris_list = b.boris_list || [];
            if (boris_list.includes(this_url)) { return }

            boris_list.push(this_url);
            chrome.storage.sync.set({ boris_list })
        });
    });
    clicked.preventDefault();  
});

// SAVE INGREDIENTS title 
document.getElementById("save-ing-title").addEventListener("submit", (clicked) => {
    chrome.storage.local.get("Database", (db) => {
        chrome.storage.sync.get("lastURL", (url) => {
            let title = document.getElementById("ingredients-title");
            console.log(title.value)
            let Database = db.Database;
            if (title.value != "") { 
                //Database.title_ingredients.push(title.value.toLowerCase());
                //chrome.storage.local.set({ Database });
                chrome.runtime.sendMessage({ 
                    message: "update titles", 
                    content: [url.lastURL.match(/http[^ ]+?\/{2}([^ ]+?)\//)[1], title.value] 
                });
            }
            title.value = "";
        });
    });
    clicked.preventDefault();  
});