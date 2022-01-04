// LIBRARY
chrome.storage.local.get("Library", async (lib) => {

    if (lib.Library == undefined) { return }
    
    var closed_caret = function(type, name) {
        var li = document.createElement("li");
        li.classList.add("no-bullets")
        li.innerHTML = `<span class="caret" id="closed"><b><i>${type}: </i></b>${name}</span>`;
        return li
    }
    var open_caret = function(name, id, line = "") {
        var li = document.createElement("li");
        li.classList.add("no-bullets")
        li.innerHTML = `<span class="caret">${name}</span>`;
        var ul = document.createElement("ul");
        ul.id = id;
        ul.classList.add("nested");
        ul.innerHTML = line;
        li.appendChild(ul);
        return li
    }

    // LIBRARY
    var recipes = document.getElementById("recipes");
    for (entry of lib.Library) {
        var recipe = open_caret("<b><i>Recipe:</i></b>", "recipe");
        // SECTION
        for (section of entry.recipe) {
            var html_section = open_caret(`<b><i>${section.title}</i></b>`, "section");
            // LINE
            for (line of section.list) { 
                var html_line = open_caret(line.line, "line");
                if (line.to_scale != undefined && line.to_scale.length > 0) { 
                    var html_to_scale = open_caret("<b><i>to_scale</i></b>", "to_scale");
                    var to_scale = document.createElement("p");
                    for (group of line.to_scale) {
                        to_scale.innerHTML += `<i>float: </i>${group.float}, <i>index: </i>${group.index}, 
                                                <i>name: </i>${group.name}, <i>type: </i>${group.type}<br>`
                    }
                    html_to_scale.lastChild.appendChild(to_scale);
                    html_line.lastChild.appendChild(html_to_scale)
                }
                if (line.values != undefined && line.values.length > 0) { 
                    var html_values = open_caret("<b><i>values</i></b>", "values");
                    var values = document.createElement("p");
                    for (group of line.values) {
                        values.innerHTML += `<i>floats: </i>${group.floats}, <i>index: </i>${group.index}, 
                                            <i>name: </i>${group.name}, <i>type: </i>${group.type}, 
                                            <i>numbers: </i>${group.numbers}, <i>unit: </i>${group.unit}<br>`
                    }
                    html_values.lastChild.appendChild(values);
                    html_line.lastChild.appendChild(html_values);
                }
                if (html_line.lastChild.innerHTML == "") { html_line.firstChild.id = "closed"}

                html_section.lastChild.appendChild(html_line)
            }
            recipe.lastChild.appendChild(html_section);
        }

        var html_entry = open_caret(entry.title, "page");
        var title = closed_caret("Title", entry.title);
        var host = closed_caret("Host", entry.host);
        var url = closed_caret("URL", entry.url);
        var text = open_caret("<b><i>Text:</i></b>", "text", entry.text); 
        
        html_entry.lastChild.appendChild(title).appendChild(host).appendChild(url).appendChild(text).appendChild(recipe);
        html_entry.innerHTML += "<hr>"
        recipes.appendChild(html_entry);
    }
});

// BORIS LIST
const boris_btn = document.getElementById("boris-btn")
const boris_list = document.getElementById("boris-list")
chrome.storage.sync.get("boris_list", (b) => {
    let list = b.boris_list || [];
    // PRINT ITEMS
    for (url of list) {
        boris_list.innerHTML += `<li><a href="${url}" target="_blank">${url}</a><button type="button" 
                        class="btn-close" name="delete" id="${url}"></button></li>`
    }
    // DELETE ITEM
    boris_list.addEventListener("click", (clicked) => {
        if (clicked.target.name == "delete") {
            list = list.filter(url => { return url != clicked.target.id});
            chrome.storage.sync.set({ boris_list: list });
            chrome.tabs.update({ url: "chrome-extension://injkbejjohehdckcifnlffonfihbjejb/data.html" });
        }
    });
});


// Nav buttons
let btn_group = document.getElementById("btn-group");
let pages = document.getElementsByClassName("page")
btn_group.addEventListener("change", (button) => {
    for (page of pages) {
        if (page.id == button.target.dataset.page) { page.style.display = "block" }
        else { page.style.display = "none" }
    }
});

// STORAGE
let sync_storage = document.getElementById("sync");
chrome.storage.sync.get(null, (sync) => {
    var syncKeys = Object.keys(sync);
    printBasedOnTypeof(sync, syncKeys, sync_storage)
});
let local_storage = document.getElementById("local");
chrome.storage.local.get(null, async (local) => {
    var localKeys = Object.keys(local);
    printBasedOnTypeof(local, localKeys, local_storage)
    // Carets
    toggler();
});



//////  FUNCTIONS  //////
function toggler() {
    var toggler = document.getElementsByClassName("caret");
    for (var i = 0; i < toggler.length; i++) {
        toggler[i].addEventListener("click", function() {
            this.classList.toggle("caret-down");
            if (this.id == "closed") { return }
            this.parentElement.querySelector(".nested").classList.toggle("active");
        });
    }
}

function printBasedOnTypeof(object, keys, parent) {
    for (key of keys) {
        var li = document.createElement("li");
        if (typeof object[key] == "object" && object[key] != null) { 
            try {
                var span = document.createElement("span");
                span.classList.add("caret")
                span.innerHTML += key;
                var ul = document.createElement("ul");
                ul.classList.add("nested")
                ul.id = key;
                li.appendChild(span);
                li.appendChild(ul);
                printBasedOnTypeof(object[key], Object.keys(object[key]), ul)
            }
            catch(e) {
                console.log("ERROR", e)
                console.log(object[key])
            }
        }
        else { 
            li.classList.add("li")
            if (!Array.isArray(object)) { li.innerHTML += `<i>${key}</i>: ` }
            li.innerHTML += `${object[key]}` 
        }
        parent.appendChild(li)
    }
}
