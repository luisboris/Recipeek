//GLOBAL VARIABLES 
const info = document.getElementById('info')
const focus_type = document.getElementsByName('focus-type')
const radio = document.getElementById('recipes-radio')
let length = 0      // number of Recipes found
let has_results = false
let tabId = null
let page_title = ''


// get the active tab (page requested)
chrome.tabs.query({ active: true, currentWindow: true }, async (tab) => {
    tabId = await tab[0].id

    // check if PAGE.js aleady loaded 
    messageScript(tabId, 'you there?');

    // process messages from PAGE.js
    chrome.runtime.onMessage.addListener((request)=> { listenToScript(request) });

    // BUTTONS
    for (let button of document.getElementsByTagName('button')) {
        // only for BUTTONS with id
        if (button.id == '') { continue }

        button.addEventListener('click', ()=>  { 
            if (button.id == 'reset') { reset() }   
            messageScript(tabId, button.id) 
        });
    }

    // RADIOS
    for (let radio of document.getElementsByName('toggle')) { 
        radio.addEventListener('change', ()=> handleRadios() );
    }

    // CHECKBOXES
    for (let box of document.getElementsByName('checkbox')) { 
        box.addEventListener('change', ()=> handleCheckboxes() );
    }
});


////// FUNCTIONS
function messageScript(tabId, message, content=null) {
    /*
    Sends a message to PAGE.js
    If its the first message, check for connection with PAGE.js and catch runtime Errors.
    If there are no Errors, create Radio Buttons to select RECIPES
    */
    if (has_results == true) { 
        chrome.tabs.sendMessage(tabId, { message, content }); 
    }
    else {
        chrome.tabs.sendMessage(tabId, { message, content }, (response)=> { 
            if (chrome.runtime.lastError !== undefined) { 
                loading(true)
                chrome.tabs.executeScript({ file: 'PAGE.js' }, ()=> {
                    if (chrome.runtime.lastError !== undefined) { 
                        info.innerText = 'no picking in here!' 
                    }
                });
            }
            else { 
                length = response.length
                page_title = response.title
                createRecipeRadios(length)
                createFeedbackRadios(length)
                has_results = true 
            }
        });
    }
}

function listenToScript(request) {
    switch (request.message) {
        case 'results :)': 
            has_results = true;
            length = request.length
            createRecipeRadios(length)
            createFeedbackRadios(length)
            break
        case 'no results :(':
            has_results = false;
            loading(false)
            break
        case 'reset':
            reset()
            break
    }
}

function reset() {
    for (let radio of document.getElementsByName('toggle')) { radio.checked = false }
}

function loading(load) {
    let string = load ? 'loading...' : 'NO RECIPE FOUND :('
    radio.innerHTML = 
        '<input type="radio" name="toggle" value="none" class="btn-check" id="btnradio" autocomplete="off" disabled></input>' +
        `<label class="btn btn-outline-primary" for="btnradio0">${string}</label>`
}

function handleRadios() {
    /*
    TODOsend an array of strings with each value (recipe + number + hide/show)
    */
    for (let radio of document.getElementsByName('toggle')) {
        let message = radio.value.match(/[a-zA-Z.]+/)[0]
        let content = radio.value.match(/[^a-zA-Z.]+/)[0] || null
        if (radio.checked) { console.log(message, content); messageScript(tabId, message, content) }
    }
}

function handleCheckboxes() {
    for (let box of document.getElementsByName('checkbox')) {
        let content = box.checked ? 'hide' : 'show'
        if (box.checked) { console.log(box.value, content); messageScript(tabId, box.value, content) }
    }  
}

function createRecipeRadios(length) {
    /*
    Create a radio with label for each RECIPE to display and another one to display all of them
    Add an eventListener for each
    */
    radio.innerHTML = ''

    for (let i = -1; i < length; i++) {
        let checkbox = document.createElement('input');
        checkbox.setAttribute('type', 'radio')
        checkbox.setAttribute('name', 'toggle')
        checkbox.setAttribute('value', `recipes${i}`)
        checkbox.classList.add('btn-check')
        checkbox.setAttribute('id', `btnradio${i}`)
        checkbox.setAttribute('autocomplete', 'off')

        let label = document.createElement('label')
        label.classList.add('btn', 'btn-outline-primary')
        label.setAttribute('for', `btnradio${i}`)
        // only 1 recipe
        if (length == 1) {  
            label.innerText = 'Peek Recipe'
            i = 0
        }
        // multiple recipes
        else if (i == -1) { label.innerText = 'Peek All' }
        else { label.innerText = `Recipe #${i+1}` }

        radio.appendChild(checkbox)
        radio.appendChild(label)

        checkbox.addEventListener('change', ()=> { handleRadios() });
    }
}

function createFeedbackRadios(length) {
    const feedback_radio = document.getElementById('feedback-radio')
    feedback_radio.innerHTML = ''
    
    for (let i = 0; i < length; i++) {
        let rec = document.createElement('div')
        rec.classList.add('btn-group')
        feedback_radio.appendChild(rec)
        
        createRadio(i, 'feedback', `Recipe #${i+1}`, rec)
        createRadio(i, 'feedback.ing', 'Ingredients', rec)
        createRadio(i, 'feedback.meth', 'Instructions', rec)
    }
}

function createRadio(index, value, text, parent) {
    let checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'radio')
    checkbox.setAttribute('name', 'toggle')
    checkbox.setAttribute('value', `${value}${index}`)
    checkbox.classList.add('btn-check')
    checkbox.setAttribute('id', `btn${value}${index}`)
    checkbox.setAttribute('autocomplete', 'off')

    let label = document.createElement('label')
    label.classList.add('btn', 'btn-outline-primary')
    label.setAttribute('for', `btn${value}${index}`)
    label.innerText = text
    
    parent.appendChild(checkbox)
    parent.appendChild(label)

    checkbox.addEventListener('change', ()=> { handleRadios() });
}
