const list_elements = document.getElementsByTagName("li");
const displaySections = document.getElementsByClassName('display-section');
const editSections = document.getElementsByClassName('edit-section');
const recipes_section = document.getElementById("recipes")

// scale RECIPE
const scale = document.getElementById("customRange3")
scale.addEventListener("change", () => {
    chrome.storage.sync.get("lastURL", (url) => {               
        chrome.storage.local.get("Library", (lib) => {
            // original scale
            if (scale.value == 0) { printScaledMain() }
            else {
                const Page = lib.Library.find(entry => { return entry.url == url.lastURL });
                const newList = scaleRecipe(Page.recipe, scale.value);
                printScaledMain(newList);
                chrome.storage.local.set({ currentDisplay: newList });   
            }
        });
    });
});

// EDIT MODE
const editSwitch = document.getElementById("editSwitch");
editSwitch.addEventListener("change", () => {  
    const options_bar = document.getElementById("upper-fixed");
    const hide_in_edit_mode = document.getElementsByClassName("no-edit");
    const edit_header = document.getElementById("edit-header")
    const options_line = document.getElementById("options-line")
    const revert_button = document.getElementById("edit-undo");
    const submit_buttons = document.getElementById("edit-save");
    const options_info = document.getElementById("options-info")
    const options_buttons = document.getElementsByClassName("options-buttons")
    const content = document.getElementById("content");
    const form_control = document.querySelectorAll("span.form-control") 
    const x_buttons = document.querySelectorAll('.edit-delete')
    let changed_lines = []
    let previous_group;
    let block_in_edit;

    if (editSwitch.checked) {
        // toggle Buttons and OPTIONS LINE
        submit_buttons.style.display = "block"
        revert_button.style.display = "block"
        for (section of editSections) { section.style.display = "block" }
        for (section of displaySections) { section.style.display = "none" }
        options_line.style.display = "flex"
        // hide SCALE and LEFT COLUMN; make HEADER editable; make CONTENT fit page
        for (element of hide_in_edit_mode) { element.style.display = "none" }
        edit_header.style.display = "block"
        content.classList.add("edit-whole-page");
        options_bar.classList.add("edit-upper-menu");
        // TODO - previous_group and block_in_edit

        // delete LINE
        for (button of x_buttons) { button.addEventListener("click", deleteLine) }
        function deleteLine() {
            let group = this.parentElement;
            // EDIT GROUP
            if (group.classList.contains("edit-group")) { 
                group.style.display = "none";
                group = group.previousSibling;
                previous_group = undefined; 
            }
            group.style.display = "none";
            group.dataset.discard = "true";
            // sub group in array
            if (group.nextSibling && group.nextSibling.classList.contains("edit-group")) {
                for (block of group.nextSibling.children) { block.innerText = block.getAttribute("value") }
            }
            // sub group in CHANGED_LINES and add GROUP
            changed_lines = changed_lines.filter(line => { return line.group.getAttribute('value') != group.getAttribute('value') })
            changed_lines.unshift({ discard: true, group, text: group.firstChild.getAttribute('value') });
        }

        // delete SECTION
        for (button of document.getElementsByClassName("edit-delete-section")) { button.addEventListener("click", deleteSection) }
        function deleteSection() {
            let section = this.parentElement.parentElement;
            let section_index = section.getAttribute("name").split("-")[1]
            section.style.display = "none"
            // make every line a "discard"
            for (child of section.children) { child.dataset.discard = "true" }
            // delete children in CHANGED_LINES and add SECTION
            changed_lines = changed_lines.filter(line => { return line.group.getAttribute('value').split(".")[0] != section_index })
            changed_lines.unshift({ section, name: section.getAttribute("name") })
            //////
        }
       
        // FOCUS/BLUR 
        for (element of form_control) { 
            element.addEventListener("focus", whenFocused); 
            element.addEventListener("blur", whenBlurred);
        }
        function whenFocused() {
            let text_group = this.parentElement;
            let edit_group = text_group.nextElementSibling;
            // line has values (is followed by EDIT GROUP)
            if (edit_group && edit_group.classList.contains("edit-group")) {
                text_group.style.display = "none";
                edit_group.style.display = "flex";
                edit_group.firstChild.focus();
            }
        }
        function whenBlurred() {
            let span = this;
            let group = span.parentElement;
            // line with values (EDIT BLOCK)    
            // it goes through this every time to record every change, 
            // but only stores it (in changed_lines) when it is differente from the original Line
            if (span.classList.contains("edit-block")) {
                previous_group = span
                // find group in list and delete it
                let changed_elements = changed_lines.find(line=>{ return line.group == group }) 
                if (changed_elements == undefined) { changed_elements = { discard: false, group, text, elements: [] }}
                else { changed_lines = changed_lines.filter(line => { return line.group.getAttribute('value') != group.getAttribute('value') }) }
                // get ELEMENTS and TEXT from BLOCKS
                changed_elements.text = ""
                for (block of group.children) {
                    if (!block.classList.contains("edit-block")) { continue }
                    let index = block.dataset.elementIndex;
                    changed_elements.elements[index] = block.innerText;
                    changed_elements.text += block.innerText + " ";
                }
                changed_elements.text = changed_elements.text.replaceAll(/\( /g, "(").replaceAll(/ \)/g, ")").replaceAll(/ ,/g, ",")
                // update LINE in TEXT-GROUP
                group.previousSibling.firstChild.innerText = changed_elements.text;
                // there was a change - LINE not equal to original
                if (group.previousSibling.firstChild.innerText.trim() != group.previousSibling.firstChild.getAttribute('value').trim()) { 
                    changed_lines.unshift(changed_elements)
                }
            }
            // line without values (TITLE or METHOD GROUP) and changed
            else if (group.getAttribute("id") == "edit-header" || !group.nextElementSibling.classList.contains("edit-group")) {
                // delete from changed_lines
                changed_lines = changed_lines.filter(line => { return line.group.getAttribute('value') != group.getAttribute('value') })
                // there was a change
                if (span.getAttribute("value") != span.innerText) {
                    let text = span.innerText;
                    changed_lines.unshift({ discard: false, group, text });
                }
            }
        }
       
        // when clicked in body
        document.body.addEventListener("click", bodyClick);
        function bodyClick(clicked) {
            //console.log(document.activeElement) 
            //console.log(changed_lines) 

            // toggle BLOCK edition
            if (document.activeElement.classList.contains("edit-block")) {
                for (button of options_buttons) { button.removeAttribute("disabled") }
                block_in_edit = document.activeElement;
            }
            else {
                for (button of options_buttons) { button.setAttribute("disabled", "") }
                block_in_edit = undefined;
            }

            // OPTIONS INFO
            if (document.activeElement.classList.contains("form-control")) { 
                options_info.innerText = document.activeElement.dataset.elementType || "text" 
            }
            else {options_info.innerText = "" }
            
            if (previous_group && document.activeElement.parentElement != previous_group.parentElement && !clicked.target.classList.contains("options")) {
                previous_group.parentElement.style.display = "none";
                previous_group.parentElement.previousSibling.style.display = "flex";
                previous_group = undefined; 
            }
        }

        // OPTIONS
        const options_buttons = document.querySelectorAll(".options-button")
        for (button of options_buttons) { button.addEventListener("click", options) }
        function options(button) {
            let previous_class = block_in_edit.dataset.elementType;
            let element_index = parseInt(block_in_edit.dataset.elementIndex);
            let new_index;

            switch(button.target.id) {
                case "delete-block":
                    let group = block_in_edit.parentElement;
                    // more than 1 BLOCK left 
                    if (group.children.length > 2) { 
                        // last BLOCK
                        if (block_in_edit.classList.contains("before-x")) { block_in_edit.previousSibling.classList.add("before-x") }
                        // remove BLOCK from GROUP
                        block_in_edit.remove();
                        previous_group = undefined;
                        // correct INDEXES
                        new_index = element_index;
                        for (block of group.children) {
                            if (parseInt(block.dataset.elementIndex) < element_index || block.classList.contains("edit-delete")) { continue }
                            block.dataset.elementIndex = new_index;
                            new_index++;
                        }
                    }
                    // update TEXT GROUP

                    // focus first sibling BLOCK
                    group.firstChild.focus()
                    break
                case "new-block":
                    let list_index = block_in_edit.dataset.listIndex;
                    let type = button.target.name;
                    let new_block = document.createElement("span");
                    new_block.classList.add("form-control", "edit-block", type, "new-block");
                    new_block.dataset.listIndex = list_index;
                    new_block.dataset.elementType = type;
                    new_block.contentEditable = true;
                    // last BLOCK
                    if (block_in_edit.nextSibling.classList.contains("edit-delete")) { 
                        block_in_edit.classList.remove("before-x")
                        new_block.classList.add("before-x");
                    }
                    // insert NEW BLOCK to right of block_in_edit
                    block_in_edit.insertAdjacentElement("afterend", new_block);
                    // correct INDEXES
                    new_index = element_index;
                    for (child of block_in_edit.parentElement.children) {
                        if (parseInt(child.dataset.elementIndex) <= element_index || child.classList.contains("edit-delete")) { continue }
                        new_index++;
                        child.dataset.elementIndex = new_index;
                    }
                    // update TEXT GROUP
                    // block_in_edit.parentElement.previousSibling.firstChild.innerText = changed_elements.text;
                    // focus NEW BLOCK
                    new_block.addEventListener("blur", whenBlurred);
                    new_block.focus();
                    break
                case "number":
                    // check correct input
                    if (block_in_edit.innerText.match(/^[0-9]+([\/\.][0-9]+)?$/)) { 
                        block_in_edit.classList.remove(previous_class)
                        block_in_edit.classList.add("number")
                        block_in_edit.dataset.elementType = number;
                        block_in_edit.dataset.currentValue = block_in_edit.innerText;
                    }
                    else { window.alert("please insert a valid number")  }
                    block_in_edit.focus();
                    break
            }
        }

        // undo CHANGES
        revert_button.addEventListener("click", undo);
        function undo(){
            if (changed_lines.length == 0) { return }
            let text_group = changed_lines[0].group;
            // TODO undo deleted blocks
            // EDIT-GROUP
            if (changed_lines[0].elements) { 
                for (block of changed_lines[0].group.children) { 
                    if (block.classList.contains("edit-block")) { block.innerText = block.getAttribute("value") }
                }
                text_group = text_group.previousSibling;
            } 
            // TEXT-GROUP
            if (text_group) {
                text_group.style.display = "flex";
                text_group.firstElementChild.innerText = text_group.firstElementChild.getAttribute('value')
                text_group.dataset.discard = false;
            }
            // SECTION
            else {
                changed_lines[0].section.style.display = "block";
                // erase "discard" in every line
                for (child of changed_lines[0].section.children) { child.dataset.discard = false }
            }
            changed_lines.shift();
        }

        // save Changes
        submit_buttons.addEventListener("click", () => { saveChanges() });

        // DISPLAY MODE
        editSwitch.addEventListener("change", () => {  
            if (!editSwitch.checked) {
                submit_buttons.style.display = "none"
                revert_button.style.display = "none"
                for (section of editSections) { section.style.display = "none" }
                for (section of displaySections) { section.style.display = "block" }

                // show HEADER, SCALE and LEFT COLUMN, 
                for (element of hide_in_edit_mode) { element.style.display = "block" }
                edit_header.style.display = "none"
                content.classList.remove("edit-whole-page")
                options_bar.classList.remove("edit-upper-menu");

                // remove OPTIONS LINE
                options_line.style.display = "none"

                // reset scale
                scale.value = 0
                printScaledMain();
                
                // remove EventListeners
                for (button of x_buttons) { button.removeEventListener("click", deleteLine) }
                for (element of form_control) { element.removeEventListener("focus", whenFocused); element.removeEventListener("blur", whenBlurred) }
                document.body.removeEventListener("click", bodyClick);
                revert_button.removeEventListener("click", undo);
                submit_buttons.removeEventListener("click", () => { saveChanges(changed_lines) });
            }
        });
    } 
});


//////  FUNCTIONS  //////
function saveChanges() {
    chrome.storage.sync.get("lastURL", (url) => {               
        chrome.storage.local.get("Library", (lib) => {
            const edit_header = document.getElementById("edit-header")
            const list_groups = document.body.querySelectorAll(".edit-section");
            const groups = document.querySelectorAll(".text-group");
            const index = lib.Library.findIndex(entry => { return entry.url == url.lastURL });
            let recipe = lib.Library[index].recipe;
            let lists_to_fetch = { method: [], ingredients: [] }
            let new_lists = [];
            // check for input type in elements
            const quantity_blocks = document.querySelectorAll(".quantity")
            for (block of quantity_blocks) {
                let block_elements = { number: undefined, unit: undefined, name: block.innerText, type: undefined }
                let match = block.innerText.match(/([0-9]+([\/\.][0-9]+)?)? ?([^¨]+)?/);
                // NUMBER
                if (match[1]) { 
                    block_elements.number = match[1];
                    block_elements.type = "number";
                    block.dataset.currentValue = match[1]
                    block.dataset.elementType = number
                }
                // UNIT/OTHER
                if (match[3]) { 
                    block_elements.unit = match[3];
                    if (match[1]) { 
                        block.dataset.elementType = number-unit;
                        block.dataset.unit = match[3]
                    }
                    else { 
                        block.dataset.elementType = other-quantity;
                    }
                }
            }
            // PAGE title
            lib.Library[index].title = edit_header.innerText
            // set NEW LISTS array
            for (group of list_groups) { new_lists.push({ title: group.getAttribute("name"), list: [] }) }
            // check every GROUP
            for (group of groups) {
                // SECTION INDEX
                let n = group.parentElement.getAttribute("name").split("-")[1]
                // TITLE or NOT; empty LINE
                let line;
                if (group.classList.contains("title-group")) { line = group.children[1].innerText }
                else { line = group.firstChild.innerText }
                if (line == "") { continue }
                // DISCARD
                if (group.dataset.discard == "true") { 
                    let section = group.parentElement.getAttribute("name").split("-")[0]
                    lists_to_fetch[section].push(line);
                    // TODO
                }
                // TITLE and METHOD LINES
                else if (!group.nextSibling || !group.nextSibling.classList.contains("edit-group")) {
                    new_lists[n].list.push({ line })
                }
                // INGREDIENT LINES
                else {
                    let blocks = group.nextSibling.children;
                    let text = group.firstChild.innerText;
                    let elements = [];
                    let to_scale = [];
                    for (let i = 0; i < blocks.length; i++) {
                        if (!blocks[i].classList.contains("edit-block")) { continue }
                        let type = blocks[i].dataset.elementType;
                        let name = blocks[i].innerText;
                        let index = text.search(name.replaceAll(/\W/g, "[$&]"));  // trick so regex doesn't fuck up ")", "(", etc.
                        let slice = text.slice(index)
                        text = slice.padStart(text.length, ".")
                        elements[i] = { index, type, name, number: undefined, unit: undefined }
                        if (type == "number" || type == "number-unit") { 
                            elements[i].number = blocks[i].dataset.currentValue;
                            console.log(elements[i].number, blocks[i])
                            to_scale.push({ name: elements[i].number, float: toFloat(elements[i].number), index });
                        }
                    }
                    new_lists[n].list.push({ line, elements, to_scale })
                }
            }
            recipe = new_lists;

            // filter empty lines, empty sections and rename section indexes
            for (section of recipe) { section.list = section.list.filter(line => { return line.line != "" })};
            recipe = recipe.filter(section => { return section.list.length > 1 })
            for (i in recipe) { recipe[i].title = recipe[i].title.replace(/[0-9]+/, i) }
            
            // save in Storage
            lib.Library[index].recipe = recipe;               
            chrome.storage.local.set({ Library: lib.Library });

            // update MAIN
            chrome.storage.sync.get("mainURL", data => { chrome.tabs.update({ url: data.mainURL })});

            // fetch DB
            chrome.runtime.sendMessage({ 
                message: "update lists", 
                content: [url.lastURL, lists_to_fetch] 
            });
        });
    });
}

function scaleRecipe(recipe, scale_value) {
    let scaledIngredients = [];
    let increment = (scale_value < 0) ? (-1 / scale_value) : scale_value;
    for (var section of recipe) {
        for (var entry of section.list) {
            if (!entry.to_scale) { continue }
            let new_line = {numbers: [], old: entry.line, new: entry.line};
            for (var old_number of entry.to_scale) {
                let new_number = {
                    value: old_number.float * increment,
                    name: toFraction(old_number.float * increment)
                }
                new_line.numbers.push(new_number);
                let toreplace = entry.line.substr(old_number.index);
                new_line.new = new_line.new.replace(toreplace, toreplace.replace(old_number.name, new_number.name));
            }
            scaledIngredients.push(new_line);
        }
    }
    return scaledIngredients;
}

function toFraction(number) {
    let rounded = Math.round((parseFloat(number) + Number.EPSILON) * 1000) / 1000
    let fractions = { 0.125: "1/8", 0.167: "1/6",  0.2: "1/5", 0.25: "1/4", 0.333:"1/3", 0.375: "3/8", 0.4: "2/5",   
                        0.500: "1/2", 0.6: "3/5", 0.625: "5/8", 0.667: "2/3", 0.75: "3/4", 0.8: "4/5", 0.875: "7/8" }
    if (rounded in fractions) { return fractions[rounded] }
    if (number * 100 % 1 != 0) { return Math.round((parseFloat(number) + Number.EPSILON) * 100) / 100 }   // more than 2 decimal places
    return number
}

function toFloat(number) {
    let fraction = number.match(/([0-9]+)\/([0-9]+)/);
    if (fraction) { number = parseFloat(fraction[1])/parseFloat(fraction[2]) }
    return parseFloat(number)
}

function printScaledMain(list) {
    for (li of list_elements) {
        // original values (scale.value == 0)
        if (list == undefined) { li.innerText = li.getAttribute("value"); continue }
        // new values (scale.value != 0)
        for (line of list) {
            if (li.getAttribute("value") == line.old) { li.innerText = line.new }
        }
    }
}
