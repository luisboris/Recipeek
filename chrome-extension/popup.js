//GLOBAL VARIABLES 
const mainURL = chrome.runtime.getURL("main.html");   
const info = document.getElementById('info')
const buttons = document.getElementById('display-section')
const focus_type = document.getElementsByName('focus-type')
const recipes_radios = document.getElementById('recipes-radio')
let length = 0      // number of Recipes found
let has_results = undefined
let tabId = null
let options = undefined
let page_title = ''


// get the active tab (PAGE requested) and user's OPTIONS
chrome.tabs.query({ active: true, currentWindow: true }, (tab)=> {
    tabId = tab[0].id
    
    chrome.storage.sync.get('options', (data)=> {
        options = data.options

        setOptions()
        
        // check if PAGE.js aleady loaded 
        messageScript(tabId, 'you there?');

        // process messages from PAGE.js
        chrome.runtime.onMessage.addListener((request)=> { listenToScript(request) });

        // BUTTONS
        for (let button of document.getElementsByTagName('button')) {
            button.addEventListener('click', (b)=>  { handleButtons(b) });
        }

        // RADIOS
        for (let radio of document.getElementsByClassName('radio')) { 
            radio.addEventListener('change', (r)=> handleRadios(r))
        }

        // CHECKBOXES
        for (let checkbox of document.getElementsByClassName('checkbox')) { 
            checkbox.addEventListener('change', (box)=> handleCheckboxes(box));
        }
    });
});


////// FUNCTIONS
function setOptions() {
    // get user's preferences
    chrome.storage.sync.get('options', (data)=> {
        let options = data.options
    
        for (let check of document.getElementsByClassName('checkbox')) {
            options[check.name] == 'on' ? check.checked = true : check.checked = false
        }
    
        for (let group of document.getElementsByClassName('radio-group')) {
            let choice = options[group.id]
            for (let radio of group.getElementsByClassName('radio')) {
                radio.id == choice ? radio.checked = true : radio.checked = false
            }
        }
    });
}

function messageScript(tabId, message=null, parameter=null, choice=null) {
    /*
    Sends a message to PAGE.js
    A) POPUP and SCRIPT both already running -> just send Message
    B) POPUP just opened, SCRIPT not running -> run SCRIPT (B2: URL not accesible) 
    C) POPUP just opened, SCRIPT running -> create POPUP BUTTONS
    */
    if (has_results == true) {                                                  // A
        chrome.tabs.sendMessage(tabId, { message, parameter, choice }, (response)=> { return response }); 
    }
    else {
        chrome.tabs.sendMessage(tabId, { message, parameter, choice }, (response)=> { 
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
            createRecipeRadios(request.lists)
            break
        case 'results undefined':
        case 'no recipe found':
            has_results = false;
            displayStatus(false)
            break
        case 'reset':
            reset()
            break
    }
}

function reset() {
    /*
    Uncheck every RECIPE selector Radio
    */
    for (let radio of document.getElementsByName('toggle')) { radio.checked = false }
}

function displayStatus(load) {
    buttons.style.display = 'none'
    info.innerHTML = load ?
        `<div class="d-flex align-items-center"><strong>Loading...</strong>
        <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div></div>` :
        '<strong>NO RECIPE FOUND :(</strong>'
}

function handleButtons(button) {
    let message = button.target.classList.contains('display') ? 'display' : null

    if (button.target.value == 'reset') { reset() }  
    if (button.target.classList.contains('btn-message')) {
        messageScript(tabId, message, parameter = button.target.value) 
    }
}

function handleRadios(radio) {
    let message = radio.target.classList.contains('display') ? 'display' : null
    let parameter = radio.target.value.match(/[a-zA-Z.]+/)[0]
    let choice = radio.target.value.match(/[^a-zA-Z.]+/)[0] || null

    chrome.storage.sync.get('options', (data)=> {
        let options = data.options
        options[parameter] = choice

        info.innerText = options[parameter]

        chrome.storage.sync.set({ options }, ()=> {
            messageScript(tabId, message, parameter, choice)
        })
    });
}

function handleCheckboxes(checkbox) {
    let message = checkbox.target.classList.contains('display') ? 'display' : null
    let parameter = checkbox.target.value 
    let choice = checkbox.target.checked ? 'on' : 'off'

    chrome.storage.sync.get('options', (data)=> {
        let options = data.options
        options[parameter] = choice

        chrome.storage.sync.set({ options }, ()=> {
            messageScript(tabId, message, parameter, choice)
        })
    });
}

function createRecipeRadios(lists=true) {
    /*
    TODO
    Create a radio with label for one RECIPE to display and another one to display all of them
    Add an eventListener for each
    */
    recipes_radios.innerHTML = ''

    createRadio(0, 'recipes', `Recipe`, recipes_radios)
    if (lists) {
        createRadio(0, 'recipes.ing', 'Ingredients', recipes_radios)
        createRadio(0, 'recipes.meth', 'Instructions', recipes_radios)
    }
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

        checkbox.addEventListener('change', (r)=> { handleRadios(r) });
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
    checkbox.classList.add('btn-check', 'radio', 'btn-message', 'display')
    checkbox.setAttribute('id', `btn${value}${index}`)
    checkbox.setAttribute('autocomplete', 'off')

    let label = document.createElement('label')
    label.classList.add('btn', 'btn-outline-primary')
    label.setAttribute('for', `btn${value}${index}`)
    label.innerText = text
    
    parent.appendChild(checkbox)
    parent.appendChild(label)

    checkbox.addEventListener('change', (r)=> { handleRadios(r) });
}

function createMainTab() {
    chrome.tabs.create({ url: mainURL, active: true })
}