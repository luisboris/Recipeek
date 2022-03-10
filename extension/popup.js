const info = document.getElementById('info')
const buttons = document.getElementById('display-section')
const recipesRadios = document.getElementById('recipes-radio')

let length = 0      // number of Recipes found
let hasResults      // RECIPE found or not
let currentTab      // page which user is interacting with
let options         // user's preferences


main()


function main() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tab)=> {
        currentTab = tab[0]
        
        chrome.storage.sync.get('options', (data)=> {
            options = data.options

            setOptions()
            
            // check if PAGE.js aleady loading/loaded 
            messageToScript(currentTab.id, 'you there?');           tStart = Date.now() / 1000

            // process messages from PAGE.js
            chrome.runtime.onMessage.addListener(request => { messageFromScript(request) });

            for (let button of document.getElementsByTagName('button')) {
                button.addEventListener('click', b =>  handleClick(b));
            }
            for (let radio of document.getElementsByClassName('radio')) { 
                radio.addEventListener('change', r => handleClick(r))
            }
            for (let checkbox of document.getElementsByClassName('checkbox')) { 
                checkbox.addEventListener('change', c => handleClick(c));
            }
        });
    });
}

/** Set Checkboxes and Radios checks according to user's preferences */
function setOptions() {
    for (let check of document.getElementsByClassName('checkbox')) {
        check.checked = (options[check.value] === 'on')
    }
    for (let group of document.getElementsByClassName('radio-group')) {
        let choice = options[group.id]
        for (let radio of group.getElementsByClassName('radio')) {
            radio.checked = (radio.id === choice)
        }
    }
}

/** Send message to PAGE.js */
function messageToScript(tabId, message=null, parameter=null, choice=null) {
    chrome.tabs.sendMessage(tabId, { message, parameter, choice }, ()=> { 
        if (!hasResults && chrome.runtime.lastError) {  // no response means page.js is not yet executed
            displayStatus(true)
            
            chrome.tabs.executeScript({ file: 'page.js' }, ()=> {
                if (chrome.runtime.lastError) {  // cannot execute script in this page
                    info.innerHTML = '<strong>No peeking in here!</strong>' 
                }
            });
        }
    });
}

/** Message from PAGE.js */
function messageFromScript(request) {
    switch (request.message) {
        case 'recipe found': 
            hasResults = true;
            buttons.style.display = 'block'
            createRecipeRadios(request.info)
            createPageList()
            break
        case 'no recipe':
            hasResults = false;
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
    for (let radio of document.getElementsByName('toggle')) { 
        radio.checked = false 
    }
}

function displayStatus(loading) {
    buttons.style.display = 'none'
    if (loading) {
        info.innerHTML = '<div class="d-flex align-items-center"><strong>Loading...</strong><div class="spinner-border ms-auto" role="status" aria-hidden="true"></div></div>'
    } else { 
        info.innerHTML = '<strong>NO RECIPE FOUND :(</strong>'
    }
}

/** Each time a user clicks in a button send a message to PAGE.js*/
function handleClick(input) {
    let message = input.target.classList.contains('display') ? 'display' : null
    let parameter, choice

    switch(input.target.type) {
        case 'button':
            parameter = input.target.value
            if (!input.target.classList.contains('btn-message')) { return }
            if (input.target.value === 'reset') { reset() }  
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
        if (input.target.classList.contains('options')) { options[parameter] = choice }  // user changed some preference
        chrome.storage.sync.set({ options }, ()=> { 
            messageToScript(currentTab.id, message, parameter, choice) 
        });
    });
}

/** Creates Radio Buttons to display each RECIPE and respective LISTS */
function createRecipeRadios(info) {
    recipesRadios.innerHTML = ''

    if (info.length > 1) {  // multiple RECIPES
        let rec = document.createElement('div')
        rec.classList.add('btn-group')
        recipesRadios.appendChild(rec)

        createRadio(-1, 'recipes', `Show All`, rec)
    }

    for (let i in info.lists) {  // for each RECIPE
        let rec = document.createElement('div')
        rec.classList.add('btn-group')
        recipesRadios.appendChild(rec)
        
        let index = parseInt(i)+1
        createRadio(i, 'recipes', `Recipe #${index}`, rec)
        if (info.lists[i]) {  // if there are LISTS
            createRadio(i, 'recipes.ing', 'Ingredients', rec)
            createRadio(i, 'recipes.meth', 'Instructions', rec)
        }
    }
}

function createRadio(index, value, text, parent) {
    let radio = document.createElement('input');
    radio.setAttribute('type', 'radio')
    radio.setAttribute('name', 'toggle')
    radio.setAttribute('value', `${value}${index}`)
    radio.classList.add('btn-check', 'radio', 'btn-message', 'display')
    radio.setAttribute('id', `btn${value}${index}`)
    radio.setAttribute('autocomplete', 'off')

    let label = document.createElement('label')
    label.classList.add('btn', 'btn-outline-primary')
    label.setAttribute('for', `btn${value}${index}`)
    label.innerText = text
    
    parent.appendChild(radio)
    parent.appendChild(label)

    radio.addEventListener('change', r => handleClick(r));
}

function createPageList() {
    chrome.storage.sync.get('saved', (pages) => {
        let pagelist = document.getElementById('saved-pages')
        pagelist.innerHTML = '<option selected disabled>Saved Pages</option>'
        
        if (!pages.saved) { return }

        let savedPages = pages.saved
        for (let page in savedPages) {
            let option = document.createElement('option');
            option.setAttribute('value', savedPages[page][0])
            option.innerHTML = page
            pagelist.appendChild(option)
        }

        pagelist.addEventListener('change', option => {
            let url = option.target.value
            chrome.tabs.query({ url }, tabs => { 
                if (tabs[0]) { 
                    chrome.tabs.update(tabs[0].id, { active: true }) 
                } else { 
                    chrome.tabs.create({ url, index: currentTab.index+1, active: false }) 
                }
            });
        });
    })
}