//GLOBAL VARIABLES 
const info = document.getElementById('info')
let length = 0      // number of Recipes found
let has_results = false
let tabId = null

// get the active tab (page requested)
chrome.tabs.query({ active: true, currentWindow: true }, async (tab) => {
    tabId = await tab[0].id

    // check if PAGE.js aleady loaded 
    messageScript(tabId, 'you there?');

    // process messages from PAGE.js
    chrome.runtime.onMessage.addListener((request)=> { console.log(request); listenToScript(request) });

    // BUTTONS
    for (let button of document.getElementsByTagName('button')) {
        button.addEventListener('click', ()=> messageScript(tab[0].id, button.id));
    }

    // RADIOS
    for (let radio of document.getElementsByName('toggle')) { 
        radio.addEventListener('change', ()=> handleRadio() );
    }
});


////// FUNCTIONS
function messageScript(tabId, message, content=null) {
    /*
    Sends a message to PAGE.js
    If its the first message, check for connection with PAGE.js and catch runtime Errors
    */
    if (has_results == true) { 
        chrome.tabs.sendMessage(tabId, { message, content }); 
    }
    else {
        chrome.tabs.sendMessage(tabId, { message, content }, (response)=> { 
            if (chrome.runtime.lastError !== undefined) { 
                info.innerText = 'loading...'
                console.log(chrome.runtime.lastError);
                chrome.tabs.executeScript({ file: 'PAGE.js' }, ()=> {
                    if (chrome.runtime.lastError !== undefined) { 
                        info.innerText = 'no picking in here!' 
                    }
                });
            }
            else { 
                length = response.length
                createRecipeRadio(length)
                has_results = true 
            }
        });
    }
}

function listenToScript(request) {
    switch (request.message) {
        case 'results :)': 
            has_results = true;
            info.innerText = 'loaded!'
            length = request.length
            createRecipeRadio(length)
            break
        case 'no results :(':
            has_results = false;
            info.innerText = 'NO RECIPE FOUND :('
            break
        case 'reset':
            chrome.tabs.query({ active: true, currentWindow: true }, tabs=> {
                chrome.tabs.reload(tabs[0].id);
            });
            for (let radio of document.getElementsByName('toggle')) { radio.uncheck }
    }
}

function handleRadio() {
    /*
    TODOsend an array of strings with each value (recipe + number + hide/show)
    */
    for (let radio of document.getElementsByName('toggle')) {
        if (radio.checked) { messageScript(tabId, 'recipes', radio.value) }
    }
}

function createRecipeRadio(length) {
    /*
    Create a radio with label for each RECIPE to display
    and another one to display all of them
    Add an eventListener for each
    */
    let div = document.getElementById('recipes-radio')
    for (let i = -1; i < length; i++) {
        let checkbox = document.createElement('input');
        checkbox.setAttribute('type', 'radio')
        checkbox.setAttribute('name', 'toggle')
        checkbox.setAttribute('value', `${i}`)
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

        div.appendChild(checkbox)
        div.appendChild(label)

        checkbox.addEventListener('change', ()=> { handleRadio() });
    }
}
