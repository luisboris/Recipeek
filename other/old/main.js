chrome.runtime.sendMessage({ message: "loading script" });

chrome.storage.local.get("Library", (data) => {
    chrome.storage.sync.get("pageList", (p) => {

        // if Storage is reset (empty Library)
        if (p.pageList == undefined || p.pageList.length == 0) {
            document.body.innerHTML = `<h2 style="text-align: center; margin: 100px">No recipes to show</h2>`;
            chrome.runtime.sendMessage({ message: "script loaded" });
            return
        }

        let Library = data.Library || []

        // COLUMN clicked 
        document.getElementById("left-column")
        .addEventListener("click", (clicked) => { handleColumnClick(clicked, Library) })

        // ICON clicked or PAGE reloaded
        printContent()

        chrome.runtime.sendMessage({ message: "script loaded" });
    });
});


//////  FUNCTIONS  //////
function handleColumnClick(clicked) {
    if (clicked.target.name == "delete") {      // delete ITEM
        chrome.storage.sync.get("lastURL", (url) => {
            chrome.storage.sync.get("pageList", (list) => {
                chrome.storage.local.get("Library", (lib) => {

                    clicked.target.parentNode.parentNode.parentNode.remove();    // delete from Column 
                    console.log("DELETED:", clicked.target.id)

                    let Library = lib.Library.filter(page => {                   // delete ITEM from Library
                        return page.url != clicked.target.id 
                    });               
                    chrome.storage.local.set({ Library });      

                    const pageList = list.pageList.filter(url => {               // delete ITEM from PAGELIST
                        return url != clicked.target.id 
                    });    
                    chrome.storage.sync.set({ pageList });    

                    if (clicked.target.id == url.lastURL) {                      // ITEM deleted was the one being displayed
                        if (pageList.length == 0) {
                            document.body.innerHTML = `<h2 style="text-align: center; margin: 100px">No recipes to show</h2>`;
                            chrome.runtime.sendMessage({ message: "script loaded" });
                            return
                        }
                        lastURL = pageList[pageList.length-1];
                        printContent(lastURL);       
                    }
                    else { lastURL = url.lastURL };
                    chrome.storage.sync.set({ lastURL });
                });
            }); 
        });

    }
    if (clicked.target.classList.contains("column-link")) {  // change ITEM to print
        lastURL = clicked.target.id;
        chrome.storage.sync.set({ lastURL });
        printContent(lastURL);                         
    }   
    clicked.preventDefault();                             
}

function printColumn(Library, url_to_delete) {
    const column = document.getElementById("left-column");
    for (let i = Library.length-1; i >= 0; i--) {
        let page = Library[i];
        if (url_to_delete != page.url) {                                              
            const column_element = document.createElement("div");
            column_element.classList.add("column-element");
            column_element.innerHTML = `<a href="" class="list-group-item list-group-item-action active" aria-current="true"><div class="d-sm-inline-flex w-100 justify-content-between"><h5 class="mb-1 column-link" id="${ page.url }">${ page.title }</h5><button type="button" class="btn-close" name="delete" id="${ page.url }" aria-label="Close"></button></div></a>`; 
            column.appendChild(column_element);
        }
    }
}

function printContent(columnURL) {
    chrome.storage.sync.get("lastURL", (url) => {
        chrome.storage.local.get("Library", (lib) => {

            const current_page = lib.Library.find( page => {
                if (columnURL) { return page.url == columnURL }
                if (url.lastURL == "") { return page.url != "" }
                return page.url == url.lastURL
            });

            // print Header
            const header = document.getElementById("header");
            header.firstElementChild.setAttribute("href", current_page.url);
            header.firstElementChild.innerHTML = current_page.title;
            header.lastElementChild.innerHTML = current_page.host;
            header.nextElementSibling.firstElementChild.innerHTML = current_page.title;
            header.nextElementSibling.firstElementChild.setAttribute("value", current_page.title);

            // clean Recipes Section in HTML
            const recipes_section = document.getElementById("recipes");
            recipes_section.innerHTML = "";

            // print each SECTION
            for (i in current_page.recipe) {   
                const section = current_page.recipe[i];
                if (section.list.length < 2) { continue }

                let div = document.createElement("div");
                div.classList.add("section-div")
                div.setAttribute("id", i)
                recipes_section.appendChild(div);
                
                function sectionElements(type) {
                    // DISPLAY SECTION
                    let display_section = document.createElement("div");
                    let title = document.createElement("p");
                    let list = document.createElement("ul")
                    display_section.setAttribute("name", `${type}-${i}`);
                    display_section.style = "margin-bottom: 40px";
                    display_section.classList.add('display-section', 'section')
                    title.classList.add('list-title');
                    display_section.appendChild(title)
                    display_section.appendChild(list)
                    div.appendChild(display_section)
                    // EDIT SECTION
                    let edit_section = document.createElement("div");
                    edit_section.setAttribute("name", `${type}-${i}`);
                    edit_section.style.display = 'none';
                    edit_section.classList.add('edit-section', 'list-group', 'list-group-flush', 'section');
                    div.appendChild(edit_section)
                    return { edit_section, title, list };
                }
                function lineElements(section, i, j, line) {
                    // BUTTONS and LINE
                    let x_button = '<button class="input-group-text edit-delete" value="x">x</button>'
                    let delete_section_button = `<button class="input-group-text edit-delete-section" value="Delete Section">Delete Section</button>`
                    
                    let line_for_html = line.replace(/\"/g, "&quot;");  // scape quotation marks
                    // DISPLAY GROUP
                    let li = document.createElement("li");
                    li.setAttribute("value", `${line_for_html}`)
                    li.innerHTML = line;
                    // EDIT GROUP
                    let edit_group = document.createElement("div");
                    edit_group.classList.add("input-group", "edit-group");
                    edit_group.setAttribute("value", `${i}.${j}`)
                    edit_group.setAttribute("name", `${line_for_html}`)
                    edit_group.style.display = "none"
                    // TEXT GROUP
                    let text_group = document.createElement("div");
                    text_group.classList.add("input-group", "text-group");
                    text_group.setAttribute("value", `${i}.${j}`);
                    section.edit_section.appendChild(text_group);
                    let edit_text = document.createElement("span");
                    edit_text.classList.add("form-control");
                    edit_text.setAttribute("value", `${line_for_html}`);
                    edit_text.contentEditable = true;
                    edit_text.innerHTML = line;
                    text_group.appendChild(edit_text);

                    return { text_group, edit_group, li, x_button, delete_section_button, line_for_html }
                }

                if (section.title.startsWith("ingredients")) {
                    let ingredient_section = sectionElements("ingredients");
                    let has_title = false;  
                    for (let j in section.list) {
                        let line = section.list[j].line;
                        if (line == undefined) { continue }
                        let line_elements = lineElements(ingredient_section, i, j, line);

                        // EDIT GROUP 
                        // TODO if two elements in a row, use "/" in between
                        let edit_group = line_elements.edit_group;
                        for (k in section.list[j].elements) {
                            let name = section.list[j].elements[k].name;
                            let type = section.list[j].elements[k].type;
                            let block = document.createElement("span");
                            block.dataset.listIndex = `${i}.${j}`;
                            block.setAttribute("contenteditable", "true")
                            block.innerHTML = name;
                            block.classList.add("form-control", "edit-block", type);
                            block.setAttribute("value", name);
                            block.dataset.elementType = type;
                            block.dataset.elementIndex = k;
                            edit_group.appendChild(block);
                            // NUMBER
                            if (type == "number") { block.dataset.currentValue = section.list[j].elements[k].name }
                        }
                        // LINE without ELEMENTS
                        if (section.list[j].elements.length == 0) {  /////////////TODO - Cannot read property 'length' of undefined
                            let block = document.createElement("span");
                            block.dataset.listIndex = `${i}.${j}`;
                            block.setAttribute("contenteditable", "true")
                            block.innerHTML = line;
                            block.classList.add("form-control", "edit-block", "text");
                            block.setAttribute("value", line);
                            block.dataset.elementType = "text";
                            block.dataset.elementIndex = 0;
                            edit_group.appendChild(block);
                        }
                        edit_group.lastChild.classList.add("before-x")
                        edit_group.innerHTML += line_elements.x_button;
                        // exclude TITLE
                        if (has_title == true) { ingredient_section.edit_section.appendChild(edit_group) }
                        
                        // PRINT
                        let text_group = line_elements.text_group;
                        if (has_title == false) {     
                            // DISPLAY section          
                            ingredient_section.title.innerHTML += line;
                            // EDIT section
                            text_group.classList.add("title-group");
                            text_group.firstChild.classList.add("title");
                            text_group.insertAdjacentHTML("afterbegin", `<span class="form-control edit-block edit-info" value="Section Title">Section Title:</span>`);
                            text_group.insertAdjacentHTML("beforeend", line_elements.delete_section_button)
                            has_title = true;
                        }
                        else {
                            // DISPLAY section
                            line_elements.li.classList.add("ingredients");
                            if (isSeparator(line)) { line_elements.li.classList.add("no-bullets") }
                            ingredient_section.list.appendChild(line_elements.li);
                            // EDIT section
                            text_group.lastChild.classList.add("before-x")
                            text_group.innerHTML += line_elements.x_button;
                        }
                    }
                }
                if (section.title.startsWith("method")) {
                    let method_section = sectionElements("method");
                    has_title = false;       
                    for (let j in section.list) {
                        let line = section.list[j].line;
                        if (line == undefined) { continue }
                        let line_elements = lineElements(method_section, i, j, line);

                        // PRINT
                        let text_group = line_elements.text_group
                        if (has_title == false) {     
                            // DISPLAY section          
                            method_section.title.innerHTML += line;
                            // EDIT section
                            text_group.classList.add("title-group");
                            text_group.firstChild.classList.add("title");
                            text_group.insertAdjacentHTML("afterbegin", `<span class="form-control edit-block edit-info">Section Title:</span>`);
                            text_group.insertAdjacentHTML("beforeend", line_elements.delete_section_button);
                            has_title = true;
                        }
                        else {
                            // DISPLAY section
                            line_elements.li.classList.add("method");
                            if (isSeparator(line)) { line_elements.li.classList.add("no-bullets") }
                            method_section.list.appendChild(line_elements.li);
                            // EDIT section
                            text_group.firstChild.classList.add("before-x")
                            text_group.innerHTML += line_elements.x_button;
                        }
                    }
                }
                //recipes_section.innerHTML += `<br><br>`;
            }
            if (columnURL == null) { printColumn(lib.Library) }
        });        
    });
}

function isSeparator(item) {
    let list = ["notes", "tips", "for ", "nutrition"];

    if (item.length > 60) { return false }
    for (word of list) {
        if (item.toLowerCase().startsWith(word) || item.toLowerCase().endsWith(word)) { return true }
    }
    if ((item.toUpperCase() == item && item.match(/[a-zA-Z]/))
        || item.endsWith(":")
        || item.startsWith("(") && item.endsWith(")")) {
        return true;
    }
    return false;
}