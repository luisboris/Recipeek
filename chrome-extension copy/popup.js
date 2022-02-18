//GLOBAL VARIABLES 
const mainURL = chrome.runtime.getURL("main.html");   
const info = document.getElementById('info')
const buttons = document.getElementById('display-section')
const focus_type = document.getElementsByName('focus-type')
const recipes_radios = document.getElementById('recipes-radio')

let length = 0      // number of Recipes found
let has_results
let currentTab
let options

let t_start


// get the active tab (PAGE requested) and user's OPTIONS
chrome.tabs.query({ active: true, currentWindow: true }, (tab)=> {
    currentTab = tab[0]
    
    chrome.storage.sync.get('options', (data)=> {
        options = data.options

        setOptions()
        
        // check if PAGE.js aleady loaded 
        messageToScript(currentTab.id, 'you there?'); t_start = Date.now() / 1000

        // process messages from PAGE.js
        chrome.runtime.onMessage.addListener(request => { messageFromScript(request) });

        // BUTTONS
        for (let button of document.getElementsByTagName('button')) {
            button.addEventListener('click', b =>  handleClick(b));
        }

        // RADIOS
        for (let radio of document.getElementsByClassName('radio')) { 
            radio.addEventListener('change', r => handleClick(r))
        }

        // CHECKBOXES
        for (let checkbox of document.getElementsByClassName('checkbox')) { 
            checkbox.addEventListener('change', c => handleClick(c));
        }
    });
});



////// FUNCTIONS
function setOptions() {
    // get user's preferences
    chrome.storage.sync.get('options', (data)=> {
        let options = data.options
    
        for (let check of document.getElementsByClassName('checkbox')) {
            options[check.value] == 'on' ? check.checked = true : check.checked = false
        }
    
        for (let group of document.getElementsByClassName('radio-group')) {
            let choice = options[group.id]
            for (let radio of group.getElementsByClassName('radio')) {
                radio.id == choice ? radio.checked = true : radio.checked = false
            }
        }
    });
}

function messageToScript(tabId, message=null, parameter=null, choice=null) {
    /**  Sends a message to PAGE.js
    A) POPUP and SCRIPT both already running -> just send Message
    B) POPUP just opened, SCRIPT not running -> run SCRIPT (B2: URL not accesible) 
    C1) POPUP just opened, SCRIPT running, RECIPE undefined -> 
    C2) POPUP just opened, SCRIPT running, RECIPE defined -> create POPUP BUTTONS */

    console.log(message, parameter);

    if (has_results == true) {                                                  // A
        chrome.tabs.sendMessage(tabId, { message, parameter, choice }); 
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
        });
    }
}

function messageFromScript(request) {
    console.log(request.message);
    switch (request.message) {
        case 'results :)': 
            has_results = true;
            info.innerText = 'timing: ' + (Date.now()/1000 - t_start).toFixed(2).toString() + ' seconds'
            buttons.style.display = 'block'
            createRecipeRadios(request.info)
            createPageList()
            break
        case 'no recipe':
            has_results = false;
            displayStatus(false)
            break
        case 'reset':
            reset()
            break
        case 'pagelist changed':
            createPageList()
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
    info.innerHTML = load
        ? '<div class="d-flex align-items-center"><strong>Loading...</strong><div class="spinner-border ms-auto" role="status" aria-hidden="true"></div></div>'
        : '<strong>NO RECIPE FOUND :(</strong>'
}

function handleClick(input) {
    let message = input.target.classList.contains('display') ? 'display' : null
    let parameter, choice

    switch(input.target.type) {
        case 'button':
            parameter = input.target.value
            if (!input.target.classList.contains('btn-message')) { return }
            if (input.target.value == 'reset') { reset() }  
            break
        case 'checkbox':
            parameter = input.target.value 
            choice = input.target.checked ? 'on' : 'off'
            break
        case 'radio':
            parameter = input.target.value.match(/[a-zA-Z.]+/)[0]
            choice = input.target.value.match(/[^a-zA-Z.]+/)[0] || null
            break
    }

    chrome.storage.sync.get('options', (data)=> {
        let options = data.options
        
        if (input.target.classList.contains('options')) { options[parameter] = choice }

        chrome.storage.sync.set({ options }, ()=> { 
            messageToScript(currentTab.id, message, parameter, choice) 
        });
    });
}

function createRecipeRadios(info) {
    /*
    TODO
    Create a radio with label for one RECIPE to display and another one to display all of them
    Add an eventListener for each
    */
    recipes_radios.innerHTML = ''

    for (let i in info.lists) {
        let rec = document.createElement('div')
        rec.classList.add('btn-group')
        recipes_radios.appendChild(rec)
        
        let index = parseInt(i)+1

        createRadio(i, 'recipes', `Recipe #${index}`, rec)
        if (info.lists[i]) {
            createRadio(i, 'recipes.ing', 'Ingredients', rec)
            createRadio(i, 'recipes.meth', 'Instructions', rec)
        }
    }
}

function createPageList() {
    chrome.storage.sync.get('saved', (lib) => {
        let page_list = document.getElementById('saved-pages')
        page_list.innerHTML = '<option selected disabled>Saved Pages</option>'
        
        if (!lib.saved) { return }

        let pages = lib.saved
        for (let pagename in pages) {
            let option = document.createElement('option');
            option.setAttribute('value', pages[pagename][0])
            option.innerHTML = pagename
            page_list.appendChild(option)
        }

        page_list.addEventListener('change', option => {
            chrome.tabs.query({ url: option.target.value }, tabs => { 
                console.log('page', option.target);
                tabs[0] ?
                    chrome.tabs.update(tabs[0].id, { active: true }) :
                    chrome.tabs.create({ url: option.target.value, index: currentTab.index+1, active: false })
            });
        });
    })
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

    checkbox.addEventListener('change', (r)=> { handleClick(r) });
}