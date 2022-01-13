//GLOBAL VARIABLES 
const optionsURL = chrome.runtime.getURL("options.html");   
const info = document.getElementById('info')
const buttons = document.getElementById('display-section')
const focus_type = document.getElementsByName('focus-type')
const recipes_radios = document.getElementById('recipes-radio')
let length = 0      // number of Recipes found
let has_results = false
let tabId = null
let options = undefined
let page_title = ''


// get the active tab (PAGE requested) and user's OPTIONS
chrome.tabs.query({ active: true, currentWindow: true }, async (tab)=> {
    tabId = await tab[0].id
    
    chrome.storage.sync.get('options', async (data)=> {
        options = await data.options
        
        // check if PAGE.js aleady loaded 
        messageScript(tabId, 'you there?');

        // process messages from PAGE.js
        chrome.runtime.onMessage.addListener((request)=> { listenToScript(request) });

        // BUTTONS
        for (let button of document.getElementsByTagName('button')) {
            // only for BUTTONS with id - IN DEVELOPMENT MODE
            if (button.id == '') { continue }

            button.addEventListener('click', ()=>  { 
                if (button.id == 'options') { optionsTab(); return }
                if (button.id == 'reset') { reset() }   
                messageScript(tabId, button.id) 
            });
        }

        // RADIOS
        for (let radio of document.getElementsByName('toggle')) { 
            radio.addEventListener('change', (r)=> handleRadios(r) );
        }

        // CHECKBOXES
        for (let checkbox of document.getElementsByName('checkbox')) { 
            checkbox.addEventListener('change', (box)=> handleCheckboxes(box) );
        }
    });
});


////// FUNCTIONS
function messageScript(tabId, message, content=null) {
    /*
    Sends a message to PAGE.js
    A) POPUP and SCRIPT both already running
    B) POPUP just opened, SCRIPT not running -> run SCRIPT (B2: URL not accesible) 
    C) POPUP just opened, SCRIPT running -> create POPUP BUTTONS
    */
    if (has_results == true) {                                                  // A
        chrome.tabs.sendMessage(tabId, { message, content }); 
    }
    else {
        chrome.tabs.sendMessage(tabId, { message, content }, (response)=> { 
            if (chrome.runtime.lastError !== undefined) {                       // B
                displayStatus(true)
                chrome.tabs.executeScript({ file: 'page.js' }, ()=> {
                    if (chrome.runtime.lastError !== undefined) {               // B2
                        info.innerHTML = '<strong>No peeking in here!</strong>' 
                    }
                });
            }
            else {                                                              // C
                buttons.style.display = 'block'
                createRecipeRadios(response.length)
                createFeedbackRadios(response.length)
                has_results = true 
            }
        });
    }
}

function listenToScript(request) {
    switch (request.message) {
        case 'results :)': 
            has_results = true;
            info.innerText = ''
            buttons.style.display = 'block'
            createRecipeRadios(request.length)
            createFeedbackRadios(request.length)
            break
        case 'no results :(':
            has_results = false;
            displayStatus(false)
            break
        case 'reset':
            reset()
            break
    }
}

function reset() {
    for (let radio of document.getElementsByName('toggle')) { radio.checked = false }
}

function displayStatus(load) {
    buttons.style.display = 'none'
    info.innerHTML = load ?
        `<div class="d-flex align-items-center"><strong>Loading...</strong>
        <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div></div>` :
        '<strong>NO RECIPE FOUND :(</strong>'
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

function handleCheckboxes(checkbox) {
    let content = checkbox.target.checked ? 'on' : 'off'
    messageScript(tabId, checkbox.target.value, content)
}

function createRecipeRadios(length) {
    /*
    TODO
    Create a radio with label for one RECIPE to display and another one to display all of them
    Add an eventListener for each
    */
    recipes_radios.innerHTML = ''

    createRadio(0, 'recipes', `Recipe`, recipes_radios)
    createRadio(0, 'recipes.ing', 'Ingredients', recipes_radios)
    createRadio(0, 'recipes.meth', 'Instructions', recipes_radios)
}

function createRecipesRadios(length) {
    /*
    Create a radio with label for each RECIPE to display and another one to display all of them
    Add an eventListener for each
    */
    recipes_radios.innerHTML = ''

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

        recipes_radios.appendChild(checkbox)
        recipes_radios.appendChild(label)

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

function optionsTab() {
    chrome.tabs.query({ url: optionsURL }, tabs=> {
        
        // OPTIONS.html already opened
        if (tabs[0]) { chrome.tabs.update(tabs[0].id, {active: true}) }
        
        // create tab for OPTION.html
        else { chrome.tabs.create({ url : optionsURL, active: true }) }
    });
}