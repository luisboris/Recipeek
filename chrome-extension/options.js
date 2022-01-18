const checks = document.getElementsByClassName('checkbox')
const radio_groups = document.getElementsByClassName('radio-group')

// get user's preferences
chrome.storage.sync.get('options', (data)=> {
    let options = data.options

    for (let check of checks) {
        options[check.name] == 'on' ? check.checked = true : check.checked = false
    }

    for (let group of radio_groups) {
        let choice = options[group.id]
        for (let radio of group.getElementsByClassName('radio')) {
            radio.id == choice ? radio.checked = true : radio.checked = false
            radio.addEventListener('change', (r)=> hhandleRadios(r))
        }
    }
});



function hhandleChecks(check) {
    let parameter = check.target.name
    let choice = check.target.checked ? 'on' : 'off'
    
    chrome.storage.sync.get('options', (data)=> {
        let options = data.options
        options[parameter] = choice

        chrome.storage.sync.set({ options })
    });
}

function hhandleRadios(radio) {
    let parameter = radio.target.name
    let choice = radio.target.id
    
    chrome.storage.sync.get('options', (data)=> {
        let options = data.options
        options[parameter] = choice

        chrome.storage.sync.set({ options })
    });
}