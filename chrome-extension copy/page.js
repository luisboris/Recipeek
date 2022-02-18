const start = Date.now()/1000
let mset, mupdate, mpredict, end
let mnodes, msublists, msub2, mfirst, mmultiple

// CLASSES
class List {
    constructor(elements, type) {
        this.type = type;                                                                       // 'ing' or 'meth'
        this.elements = elements;                                                               // HTML Element
        this.children = this.elements                                                           // children HTML Elements
            .reduce((array, el) => [...array, ...Array.from(el.children || el)], []);                 
        this.branch = getBranch(this.elements).branch;                                          // all ancestor and descendant HTML Elements
        this.trunk = getBranch(this.elements).trunk;                                            // all ancestor HTML Elements
        this.text = this.elements                                                               // plain text
            .reduce((str, el) => `${str}\n${el.innerText}`, '');                         
        this.lines = correctLines(this.text);                                                   // text divided in lines, in an array
        this.score = getScore(results[type], this.lines);                        
        this.position = elementPosition(this.elements[0]).position;                             // index of Element from collection of all Elements (from document.body.querySelectorAll('*'))
        this.deepness = elementPosition(this.elements[0]).deepness;                             // distance from document.documentElement
    }
}
class Recipe {
    constructor(ingredients, method, index) {
        this.index = index;                                         // index of Recipe when there are more than 1               
        this.ing = ingredients;                                     // a Node Object representing the Element which contains the Ingredients List
        this.meth = method;                                         // a Node Object representing the Element which contains the Method List
        if (this.ing && this.meth) {
            this.hasLists = true;
            this.lists = [this.ing, this.meth];
            this.element = findCommonAncestor(this.lists)
        } else { 
            this.hasLists = false
            this.lists = [this.ing || this.meth]
            this.element = findCommonAncestor(this.lists)
        }
        this.descendants = this.element.querySelectorAll('*');      // all descendant HTML Elements
        this.children = this.element.children;                      // children HTML Elements
        this.text = this.element.innerText;                         // plain text
        this.lines = correctLines(this.text);                       // text divided in lines, in an array
        this.listLines = this.lists
            .reduce((array, list) => [...array, ...list.lines.filter(line => this.lines.includes(line))], []);
        this.score = getScore(results.all, this.lines);             // the Score of the previous Node
        this.listScore = getScore(results.all, this.listLines);     // the Score of both List Nodes combined
    }
}

// GLOBAL VARIABLES
const NUMBERS = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
const NUMBER_TEMPLATE = `(${NUMBERS})(([ ,./-])(${NUMBERS}))?`
const UNITS = 'tsp|tsps|teaspoons|teaspoon|tbsp|tb|tbsps|tablespoons|tablespoon|cups|cup|c|lb|lbs|pounds|pound|pd|pds|ounce|ounces|oz|gram|grams|gr|g|kilogram|kilograms|kgs|kg|miligram|miligrams|mg|mgs|ml|mls|mililitre|mililiter|mililitres|mililiters|cl|cls|centiliter|centilitre|centiliter|centilitre|dl|dls|decilitre|deciliter|decilitres|deciliters|l|ls|litres|liters|litre|liter|fl oz|quarts|quart|qt|gallons|gallon|pints|pint|inch|inches|in|cm|cms|centimeter|centimetre|centimeters|centimetres|mm|mms|milimitre|milimiter|milimitres|milimiters|large|small|medium|bunch|handfull|pinch|sprinkle'
const TITLES = {
    'ing': ['ingredients'],
    'meth': ['procedure', 'preparation', 'method', 'instructions', 'steps', 'directions']
}
const PATTERN_N = `^${NUMBER_TEMPLATE} ?$`                              // single line with only NUMBER
const PATTERN_N_U = `^${NUMBER_TEMPLATE}.{0,2}(${UNITS})[^a-zA-Z]*$`    // single line with only NUMBER + UNIT
const ING_PATTERNS = [
    `^${NUMBER_TEMPLATE}.?(${UNITS})[^a-zA-Z0-9]{1,2}`,                 // NUMBER + UNIT + text
    `^${NUMBER_TEMPLATE} .+`                                            // NUMBER + text
]

let hasRecipe                                   // Boolean -> received results from predict.js or not
let results                                     // Object -> lines identified by predict.js
let recipes                                     // Arrays -> all Node and RECIPE Objects
let recipesInfo = {}
let display = {                                 // Object -> various info about how the page is currently being displayed
    
    'body': document.body,      
            
    // current NODE Objects in display
    'focused': [document.body],                                   

    // if it's currently displaying the original PAGE, the RECIPE or a single LIST
    'type': 'page',                                           

    // current RECIPES in display
    'recipes': [],                                            

    // current type of Display (entire SECTION or just LISTS)
    'focus': 'single',           
    
    // DISPLAY settings of every HTML Element (Object)
    'getIndexes': function() {
        return Array.from(document.body.querySelectorAll('*')).reduce((indexes, element, i) => {
            element.dataset.recipeekIndex = i;
            return Object.assign(indexes, {[i]: element})
        }, {})
    },
    
    // All HTML Elements that are not to change display properties (Array)
    'getUnchanged': function() {
        return Array.from(document.body.querySelectorAll('path, style, script'))
    },
    
    // All HTML Elements containing Images found in page (Object of Arrays)
    'getImages': function() {
        let elements = Array.from(document.body.querySelectorAll('*'))
        .filter(el => 
            ['image', 'img', 'figure', 'picture'].includes(el.tagName.toLowerCase()) || 
            ['.jpg', '.png', '.gif', '.bmp'].find(type => typeof el.href === 'string' && el.href.endsWith(type)) ||
            el.style.backgroundImage !== '');
        
        let containers = elements
        .reduce((images, element) => { 
            let height = window.getComputedStyle(element).height
            while (element.parentNode.innerText === '' || window.getComputedStyle(element.parentNode).height === height) { 
                element = element.parentNode 
            }
            return [...images, element] 
        }, [])
        .filter((el, i, array) => array.indexOf(el) === i);

        let subtree = containers
        .reduce((subtree, container) => {
            return [...subtree, ...Array.from(container.querySelectorAll('*'))]
        }, [])
        .filter((el, i, array) => array.indexOf(el) === i);

        return { elements, containers, subtree }
    },

    // All HTML Elements containing Videos found in page (Object of Arrays)
    'getVideos': function() {
        let elements = Array.from(document.body.querySelectorAll('*'))
        .filter(el => 
            el.tagName.toLowerCase() === 'video' || 
            Array.from(el.attributes).find(att => att.name.match('src') && att.value.match('youtube.com'))
        );
        
        let containers = elements
        .reduce((videos, element) => { 
            let height = window.getComputedStyle(element).height
            while (element.parentNode.innerText === '' || window.getComputedStyle(element.parentNode).height === height) { 
                element = element.parentNode 
            }
            return videos.includes(element) ? videos : [...videos, element] 
        }, [])

        let subtree = containers
        .reduce((subtree, container) => {
            return [...subtree, ...Array.from(container.querySelectorAll('*'))]
        }, [])
        .filter((el, i, array) => array.indexOf(el) === i);

        return { elements, containers, subtree }
    },

    // return an Array of the HTML Elements with no text/image content currently in display
    get empties() { 
        return display.branch.filter(el => 
            el.innerText === '' && 
            ![...display.images.subtree, ...display.images.containers].includes(el) && 
            ![...display.videos.subtree, ...display.videos.containers].includes(el) && 
            el.parentNode.querySelectorAll('svg, a').length === 0
        )
    },
    
    // return the BRANCHES of all NODES in display (Array)
    get branch() { return getBranch(this.focused).branch },
}



if (document.readyState !== 'complete') { 
    window.addEventListener('load', () => { main() });
}
else { main() }


//// MAIN FUNCTIONS
function main() {

    // send innerText to PREDICT.js
    chrome.runtime.sendMessage({ 
        message: "innerText", 
        text:  document.body.innerText, 
        url: window.location.href
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        
        // message from POPUP.js when Extension Icon is clicked
        if (request.message === 'you there?') { 
            // send Response to confirm this script is loading
            sendResponse({ response: 'yes' });

            if (hasRecipe === true) { messagePopup('results :)', false, recipesInfo) }
            if (hasRecipe === false) { messagePopup('no recipe', true) }
        }  

        // message from PREDICT.js with prediction RESULTS
        if (request.message === 'results') { mpredict=request.time; processResults(request.results) }

        // if more Elements have been loaded, update display Object 
        // (it happens when script starts before all page content is loaded)
        
        // all other messages should be from POPUP.js when user clicks a button/radio/checkbox
        if (!hasRecipe) { return }

        setDisplayProperties()

        switch (request.parameter) {
            case 'reset': reset()
                break
            case 'recipes': toggleRecipes(request.choice) 
                break
            case 'recipes.ing': focusList(request.choice, 'ing') 
                break
            case 'recipes.meth': focusList(request.choice, 'meth') 
                break
            case 'save': handlePagelist('save') 
                break 
            case 'delete': handlePagelist('delete') 
                break 
            case 'print': window.print() 
                break 

            // OPTIONS
            case 'focus': recipeDisplay(request.choice) 
                break
            case 'videos': console.log(display.videos.containers);
            case 'images':
            case 'compact': updateDisplay() 
                break

            // IN-DEVELOPMENT MODE - FEEDBACK
            case 'save-feedback': saveErrors() 
                break
            case 'feedback-show': displayFeedback() 
                break
            case 'feedback-reset': resetFeedback() 
                break
        }
    });

    setDisplayProperties()  // TODO suppose the page is not in it's supposed correctly display (like when devtools are open)

    updateDisplay()
}

function setDisplayProperties() {
    /** When document finishes loading, assign values to global variables */

    if (!display.indexes || Object.keys(display.indexes).length < Array.from(document.body.querySelectorAll('*')).length) {
        display.body = document.body;
        display['indexes'] = display.getIndexes()
    }

    let currentUnchanged = display.getUnchanged()
    if (!display.unchanged || currentUnchanged !== display.unchanged) {
        display['unchanged'] = currentUnchanged
    }

    let currentImages = display.getImages()
    if (!display.images || currentImages.elements.length !== display.images.elements.length) {
        display['images'] = currentImages
    }
    
    let currentVideos = display.getVideos()
    if (!display.videos || currentVideos.elements.length !== display.videos.elements.length) {
        console.log('videos changed')
        display['videos'] = currentVideos
    }

    mset = Date.now()/1000
}

function processResults(resultsReceived) {
    /*
    1. Search for a match between RESULTS and page content
    2. Find an Element for each LIST (Ingredients and Method) based on a correspondence score
    3. Find is there are multiple RECIPES
    4. Store these MATCHES in global variables
    6. Send message to POPUP
    */

    if (!resultsReceived) { 
        hasRecipe = false 
        messagePopup('no recipe', true);
        return
    }

    results = resultsReceived

    console.log(results.ing); console.log(results.meth); console.log(results.all);

    // SEARCH FOR SINGLE AND MULTIPLE RECIPES
    let firstRecipe = findRecipe(document.body, results)

    mfirst = Date.now()/1000

    let multipleRecipes = findMultipleRecipes()

    mmultiple = Date.now()/1000
    
    if (!firstRecipe && !multipleRecipes) { 
        hasRecipe = false
        messagePopup('no recipe', true) 
        return
    }
    
    if (firstRecipe && multipleRecipes) {
        // COMPARE SCORES
        let firstScore = Math.max(firstRecipe.score, firstRecipe.listScore)
        
        let recipesLines = multipleRecipes.reduce((array, recipe) => [...array, ...recipe.lines], [])
        let listLines = multipleRecipes.map(recipe => { 
            let lines = []
            if (recipe.ing) { lines.push(...recipe.ing.lines) }
            if (recipe.meth) { lines.push(...recipe.meth.lines) }
            return lines
        });
        let recipesScore = Math.max(getScore(results.all, recipesLines), getScore(results.all, listLines))
        
        recipes = (recipesScore > firstScore) ? multipleRecipes : [firstRecipe]

        console.log('SCORES:\n' + 'SINGLE RECIPE:', firstScore, '\nMULTIPLE RECIPES:', recipesScore);
    }
    else { 
        recipes = multipleRecipes || [firstRecipe] 
    }

    hasRecipe = true

    recipesInfo = {
        'length': recipes.length,
        'lists': recipes.map(recipe => recipe.hasLists)
    }
    messagePopup('results :)', false, recipesInfo)

    

    console.log('RECIPES:');
    if (multipleRecipes) {
        for (let recipe of recipes) {
            console.log(recipe);
        }
    }
    else { console.log(recipes[0]); }

    end = Date.now()/1000
    console.log('TIMES: \n\tall -', (end-start).toFixed(2))
    console.log('\tset -', (mset-start).toFixed(2));
    console.log('\tupdate -', (mupdate-mset).toFixed(2));
    console.log('\tpredict.js -', (mpredict-mupdate).toFixed(2))
    console.log('\tprocessResults -', (end-mpredict).toFixed(2))
    console.log('................')
    console.log('first:', (mfirst-mpredict).toFixed(2));
    console.log('\t nodes:', (mnodes-mpredict).toFixed(2));
    console.log('\t sublists:', (msublists-mnodes).toFixed(2));
    console.log('\t\t sub1:', (msub2-mnodes).toFixed(2));
    console.log('\t\t sub2:', (msublists-msub2).toFixed(2));
    console.log('multiple:', (mmultiple-mfirst).toFixed(2));
    console.log('final:', (end-mmultiple).toFixed(2));
}

function findMultipleRecipes() {
    
    let repeats = findRepeatedTitles()
    console.log('REPEATED TITLEs:', repeats)

    if (!repeats) { return null }

    let recipeElements = findRecipeElements(repeats)

    let ingCopy = [...results.ing]
    let methCopy = [...results.meth]

    //console.log('RECIPE ELEMENTS:', recipeElements)

    // divide results for each recipe
    let newResults = recipeElements.map(element => { 
        let lines = correctLines(element.innerText)
        let res = { 'ing': [], 'meth': [], 'all': [] }

        // order of lists
        let list = repeats.order[0]

        // Get all the Lines from this element which are in results, avoiding repetitions 
        // (the titles should be repeated and some ingredients might be in more than one recipe)
        // change list after second title is found
        for (let line of lines) {
            if (line.startsWith(repeats.titles[1])) { list = repeats.order[1] }
            if (results[list].includes(line) && !res[list].includes(line)) {
                res[list].push(line)
                res['all'].push(line)
            }
        }

        // delete lines already found
        ingCopy = ingCopy.filter(result => !res.ing.includes(result))
        methCopy = methCopy.filter(result => !res.meth.includes(result))
        
        return res
    });

    console.log('----------------------------NEW RESULTS-------------------------------', newResults);
    
    // find each recipe, filter nulls
    let recipes = recipeElements.map((element, i) => findRecipe(element, newResults[i], i)).filter(recipe => recipe)

    //console.log(recipes);

    return (recipes.length > 0) ? recipes : null
}

function findRepeatedTitles() {
    let lines = correctLines(display.body.innerText)
    
    let titles = [], order = []
    
    lines.forEach(line => {    
        let ing_title = TITLES.ing.find(title => line.startsWith(title))
        let meth_title = TITLES.meth.find(title => line.startsWith(title))
        if (ing_title) { 
            titles.push(ing_title); 
            order.push('ing')
        }
        if (meth_title) { 
            titles.push(meth_title); 
            order.push('meth')
        }
    });

    // make sure that there are at least two lists per recipe
    titles = titles.filter((title, i) => titles.indexOf(title) != titles.lastIndexOf(title) && titles.indexOf(title) === i)
    if (titles.length < 2) { return null }
    
    order = order.filter((value, i) => order.indexOf(value) != order.lastIndexOf(value) && order.indexOf(value) === i)

    return { titles, order }
}

function findRecipeElements(repeats) {
    let string = repeats.titles.reduce((str, title) => str + title + '.+?', '').replace(/\.\+\?$/, '')
    let re = new RegExp(string, 'gs')

    // 1. Search all the text for the repetitions
    let matches = document.body.innerText.toLowerCase().match(re)

    // 2. find the deepest Element that contains each mach in its innerText
    let finds = matches.map(match => {
        let deepest = document.body
        while (true) {
            let deeper = Array.from(deepest.children).find(el => el.innerText.toLowerCase().includes(match))
            if (!deeper) { break }
            deepest = deeper
        }
        return deepest
    });

    return finds
}

function findRecipe(element, currentResults, index=0) {
  
    let ingNode = findListNode(element, currentResults.ing, 'ing')
    let methNode = findListNode(element, currentResults.meth, 'meth')

    mnodes = Date.now()/1000

    if (!ingNode && !methNode) { return null }

    let firstRecipe = new Recipe(ingNode, methNode, index)

    let newRecipe = recipeSublists(firstRecipe, currentResults, index)

    msublists = Date.now()/1000

    return newRecipe || firstRecipe
}

function findListNode(parent, currentResults, type) {   
    /*
    Search document and find the NODE with the highest correspondence with the RESULTS for a given LIST. 
    Avoid Elements that are not visible (no offsetHeight)
    Do not count lines which are already in Ingredients Node
    Return a Node Object or null if there is no correspondence
    */
    let bestMatch = [null, 0]
    
    for (let element of parent.querySelectorAll('*')) {
        if (!element.innerText || element.offsetHeight === 0 || display.unchanged.includes(element)) { continue } 
        
        let lines = correctLines(element.innerText)
        let score = getScore(currentResults, lines)
        
        if (type && TITLES[type].includes(lines[0])) { score *= 2 }
        
        if (score > bestMatch[1]) { bestMatch = [element, score] }
    }

    if (!bestMatch[0]) { return null }

    return new List([bestMatch[0]], type)
}

function recipeSublists(recipe, currentResults, index) {
    /*
    Find best matches for each list within scope of RECIPE Element
    
    */
    console.log('1........................', recipe);

    let rec1, rec2
    let score1 = 0, score2 = 0

    let first = findSublist(currentResults)
    if (first) {
        let list1 = first.ing[0] ? new List([first.ing[0]], 'ing') : null
        let list2 = first.meth[0] ? new List([first.meth[0]], 'meth') : null
        rec1 = new Recipe(list1, list2, index)
        score1 = Math.max(rec1.listScore + rec1.score)
        console.log('2.......................', rec1)
    }

    msub2 = Date.now()/1000

    let second = findSublists(currentResults)
    if (second) {
        let list3 = second.ing[0] ? new List(second.ing[0], 'ing') : null
        let list4 = second.meth[0] ? new List(second.meth[0], 'meth') : null
        rec2 = new Recipe(list3, list4, index)
        score2 = Math.max(rec2.listScore + rec2.score)
        console.log('3.......................', rec2);
    }

    if (!first && !second) { return null }

    console.log('SCORES', '\n\tRECIPE:', recipe.score, '\n\tSUBLIST:', score1, '\n\tSUBLISTS:', score2)

    return score1 >= score2 ? rec1 : rec2

    function findSublist() {
        let lists = { 'ing': [], 'meth': [] }

        for (let type in lists) {

            let listResults = results[type]
            
            if (listResults.length === 0) {  // only 1 LIST
                lists[type] = [null, []]
                continue 
            }
            
            let other = type === 'ing' ? 'meth' : 'ing'
            
            // TODO - TEST THIS or: score/2
            if (type === 'meth') { listResults = listResults.filter(result => !lists.ing[1].includes(result)) }
    
            let bestMatch = [null, 0, []]
            for (let element of recipe.element.querySelectorAll('*')) {
                if (!element.innerText || element.offsetHeight === 0) { continue }
    
                let lines = correctLines(element.innerText)
                let score = listResults.filter(result => lines.includes(result)).length
    
                if (lines.length === 0) { continue }
                
                if (TITLES[type].find(title => lines[0].startsWith(title))) { score *= 2 }
                if (TITLES[other].find(title => lines.find(line => line.startsWith(title)))) { score /= 2 }

                if (score > bestMatch[1]) { bestMatch = [element, score, lines] }
            }
            
            lists[type] = [bestMatch[0], bestMatch[2]]
        }

        if (!lists.ing[0] && !lists.meth[0]) { return null }

        return lists
    }

    function findSublists() {

        // if there are titles for each section, check for order
        let lists = {}
        let ing_index = recipe.lines.findIndex(line => TITLES['ing'].find(t => line.startsWith(t)))
        let meth_index = recipe.lines.findIndex(line => TITLES['meth'].find(t => line.startsWith(t)))

        if (ing_index > -1 && meth_index > -1) {
            lists = ing_index < meth_index ?
                {1: 'ing', 2: 'meth'} :
                {1: 'meth', 2: 'ing'}
        } 
        else {
            lists = currentResults.ing.includes(currentResults.all[0]) ?
                {1: 'ing', 2: 'meth'} :
                {1: 'meth', 2: 'ing'}
        }

        // find if LIST is spread along multiple Elements - get all Elements from RECIPE Element starting from the first that 
        // contains the first LINE of RESULTS until the one who contains the last LINE.

        // look for a single elements for each line, filter already ones added
        let lines = recipe.lines
        let elements = Array.from(recipe.descendants).filter((el, i, array) => {
            
            if (!el.innerText || display.unchanged.includes(el)) { return false }

            let thisLines = correctLines(el.innerText)
            
            if (thisLines.length === 1 && lines.includes(thisLines[0])) { 
                return i === array.findIndex(el2 => el.innerText === el2.innerText)  // no duplicates; return uppermost element
            }
            else {  // make sure these lines are not divided amongst element's children
                return !Array.from(el.children).find(child => 
                    correctLines(child.innerText).find(line => thisLines.includes(line))
                )
            }
        });

        let first, second
        let lines1 = [], array1 = [], lines2 = [], array2 = [] 
        let score1 = 0, score2 = 0, avgScore = 0
        let bestCombo = [null, [], null, [], 0]

        // first LIST
        for (let i = 0; i < elements.length; i++) {
            
            let lines = correctLines(elements[i].innerText)

            if (lines.length === 0) { continue }

            // give precedence to TITLE to estabilish where first LIST starts
            if (!first && lines.includes(currentResults.all[0])) {
                first = [i, elements[i]]
            }
            if (TITLES[lists[1]].find(title => lines[0].startsWith(title))) {
                first = [i, elements[i]]
                lines1 = []  // empty array to start again from scratch
            }
            if (!first) { continue }

            array1 = elements.slice(first[0], i+1)
            
            lines1.push(...lines)
            
            // only 1 LIST
            if (currentResults[lists[2]].length === 0) { 
                score1 = getScore(currentResults[lists[1]], lines1)
                if (score1 > bestCombo[4]) { 
                    bestCombo = [array1, lines1, null, [], score1]
                }
                continue 
            }
            
            // second LIST
            lines2 = []
            second = [i+1, elements[i+1]]
            for (let j = second[0]; j < elements.length; j++) {
                
                lines2.push(...correctLines(elements[j].innerText))
                
                if (lines2.length === 0) { continue }

                // heighten score if title of respective list is in the first line
                score1 = getScore(currentResults[lists[1]], lines1)
                score2 = getScore(currentResults[lists[2]], lines2)
                if (TITLES[lists[2]].find(title => lines2[0].startsWith(title))) { score2 *= 2 }
                avgScore = (score1 + score2) / 2

                if (avgScore > bestCombo[4]) { 
                    array2 = elements.slice(second[0], j+1)
                    bestCombo = [array1, lines1, array2, lines2, avgScore]
                    //console.log(bestCombo[1], bestCombo[3], bestCombo[4]);
                }
            }
        }

        if (!bestCombo[0] && !bestCombo[2]) { return null }

        return { 
            [lists[1]]: [bestCombo[0], bestCombo[1]],
            [lists[2]]: [bestCombo[2], bestCombo[3]]
        }
    }
}


//// SECONDARY FUNCTIONS
function messagePopup(message, error=false, info) {
    chrome.runtime.sendMessage({ message, length, info });
    if (error) { throw new Error(message) }
}

function correctURL(url) {
    return url.includes('/#') ? url.replace(/\/#.+/, '/') : url
}

function correctLines(text) {
    /*
    Divide the text in lines and delete empty lines, doubles spaces and symbols at the beggining of line
    Search for list entries which are broken in different lines (e.g: "2\nlemons", "1 cup\nwater")
    and concatenate them in a single line.
    Return an array with corrected lines
    */
    if (!text) { return [] }

    let lines = text.toLowerCase().replaceAll(/^[^\w¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/gm, '').replaceAll('\n\n', '\n').replaceAll(/ +/g, ' ').split('\n')
    
    let correctedLines = []
    for (let i = 0; i < lines.length; i++) {
        // pattern broken in 2 lines: number alone || number+unit alone
        if (lines[i].search(PATTERN_N) !== -1 || lines[i].search(PATTERN_N_U) !== -1) {
            // ensure a single space between concatenated lines
            let two = `${lines[i]} ${lines[i+1]}`.replaceAll('  ', ' ')
            correctedLines.push(two)
            i++
        }
        // no pattern; avoid empty lines
        else if (lines[i].match(/\w/)) { 
            correctedLines.push(lines[i]) 
        }
    }
    return correctedLines
}

function getScore(results, lines) {
    /*
    Given a set of PREDICTIONS (results) and the LINES of a document Element,
    return the proportion between MATCHES and ERRORS (false positives and negatives).
    Avoid divisions by 0 when no errors
    */
    let copy = [...results]
    let matched = 0
    for (let line of lines) {
        if (copy.includes(line)) { 
            // delete matches from list to avoid false repetetitions
            copy.splice(copy.indexOf(line), 1)
            matched++ 
        }
    }
    let resultsScore = matched / results.length || 0
    let nodeScore = matched / lines.length || 0

    return resultsScore * nodeScore
}

function findCommonAncestor(lists) {
    /*
    For each of the Lists, iterate through their ancestors to find the closest one they all have in common.
    If there are Nodes in the same BRANCH, choose the highest one (with least depth).
    */
    let elements = lists.reduce((array, list) => [...array, ...list.elements], [])
    let branches = lists.map(list => list.branch)
    let ancestor = document.body
    // make sure not to pass over children; includes every LIST Elements
    for (let element of branches[0]) {
        if (elements.includes(element)) { break }
        if (branches.every(branch => branch.includes(element))) { 
            if (elements.every(el => Array.from(element.querySelectorAll('*')).includes(el))) {
                ancestor = element 
            }
        }
        else { break }
    }

    return ancestor
}

function getBranch(elements) { 
    /*
    Given an array of HTML Elements, return an array of their Ancestors (TRUNK) and an array with the complete BRANCH 
    (from ancestor to descendants), both of them in descending order.
    */
    let trunks = []
    let branches = []
    for (let element of elements) {
        let trunk = [element]
        let temp = element
        while (temp !== document.documentElement) {
            if (!trunks.includes(temp)) { trunk.unshift(temp) }
            temp = temp.parentNode;
        }
        trunks.push(...trunk)
        branches.push(...trunk, ...element.querySelectorAll('*'))
    }                                
    return { branch: branches, trunk: trunks }
}

function deepestNode(element) {
    /*
    Given an HTML Element, return the deepest Element (furthest away from document.documentElement) with the same innerText
    */
    if (element === null) { return }

    let deepest = element
    for (let el of textElements) {
        if (el.innerText === element.innerText && elementPosition(el).deepness > elementPosition(deepest).deepness) {
            deepest = el
        }
    }
    return deepest
}

function elementPosition(element) {
    /*
    Get the DEEPNESS (distance from document.documentElement) and 
    vertical POSITION (in the Elements order) of a given HTML Element
    */
    let position = 0
    let deepness = 0
    for (el of document.body.querySelectorAll("*")) {
        if (el === element) { break }
        position++
    }
    while (element !== document.documentElement) {
        element = element.parentNode
        deepness++
    }
    return { position, deepness }
}


////// ACTIONS
function focusRecipe(recipes) {
    /*
    
    */
    display.type = 'recipe'

    display.focused = display.focus === 'single' ? 
        recipes.map(rec => rec.element) :
        recipes.map(rec => [...rec.ing.elements, ...rec.meth.elements]).flat()

    updateDisplay()
}

function focusList(n, list) {
    display.type = list
    display.focused = recipes[n][list].elements
    updateDisplay()
}

function reset() {
    /*
    Reassign original display values
    */
    display.type = 'page'
    display.focused = [display.body]
    updateDisplay()
}

function toggleRecipes(n, Focus=true) {
    /*
    Change what RECIPES to display. 
    n represents the index of the RECIPE to display (if === -1, show all RECIPES)
    */
    display.recipes = n === -1 ? 
        recipes : 
        [recipes[n]]

    if (Focus === true) { focusRecipe(display.recipes) }
}

////// OPTIONS
function handlePagelist(action) {
    chrome.storage.sync.get('saved', (lib) => {
        let saved = lib.saved || {}

        action === 'save' ?
            saved[document.title] = [window.location.href, window.location.hostname] :
            delete saved[document.title]

        chrome.storage.sync.set({ saved })

        messagePopup('pagelist changed', false)
    });
}

function updateDisplay() {
    chrome.storage.sync.get('options', data=> {
        let options = data.options

        // type of RECIPE display
        display.focus = options['focus'] === '1' ? 
            'single' : 
            'multi'
        
        let branch = display.branch
        let empties = display.empties

        for (let element of document.body.querySelectorAll('*')) {
            if (display.unchanged.includes(element) || display.videos.subtree.includes(element)) { continue }

            // do not mess with video elements - can screw up Video controls
            if (!element.dataset.recipeekDisplay) {
                element.dataset.recipeekDisplay = window.getComputedStyle(element).display
                element.dataset.recipeekHeight = window.getComputedStyle(element).height
                element.dataset.recipeekMinHeight =  window.getComputedStyle(element).minHeight
                element.dataset.recipeekMargin = window.getComputedStyle(element).margin
                element.dataset.recipeekPadding = window.getComputedStyle(element).padding
            }

            if (!branch.includes(element)) { 
                element.style.display = 'none' 
            }
            else if (empties.includes(element)) {
                heightDisplay(element, options.compact)
            }
            else if (display.videos.containers.includes(element)) { 
                toggleElement(element, options.videos, branch)
            }
            else if (display.images.containers.includes(element) && !display.videos.containers.includes(element)) { 
                toggleElement(element, options.images, branch)
            }
            else { 
                element.style.display = element.dataset.recipeekDisplay
            }
        }

        // update margins
        ensureMinimumMargin(options.compact)
    });

    mupdate = Date.now()/1000
}

function recipeDisplay(type) {
    /*
    TODO
    */
    if (type === 1) { display.focus = 'single' }
    else { display.focus = 'multi' }

    if (display.type === 'recipe') { focusRecipe(recipes) }
    else if (display.type !== 'page') { focusList(0, display.type) }
}

function heightDisplay(element, choice) {
    if (choice === 'off') {
        element.style.height = element.dataset.recipeekHeight
        element.style.minHeight = element.dataset.recipeekMinHeight
    }
    if (choice === 'on') { 
        element.style.height = 'fit-content'; 
        element.style.minHeight = 'fit-content'; 
    }
}

function toggleElement(element, choice, branch) {
    if (choice === 'on' || !branch.includes(element)) { 
        element.style.display = 'none' 
    }
    else { 
        // restore original display of Element and its descendants
        element.style.display = element.dataset.recipeekDisplay
    }
}

function ensureMinimumMargin(choice) {
    /**  */
    
    for (let el of document.body.querySelectorAll('*')) { 
        el.style.margin = el.dataset.recipeekMargin
        el.style.padding = el.dataset.recipeekPadding
    }

    if (choice === 'off' || display.type === 'page') { return }

    let container = Array.from(document.body.querySelectorAll('*')).find(el => 
        el.style.display !== 'none' &&
        el.offsetHeight > 0 && 
        (el.innerText && 
        el.innerText !== '' || 
        display.images.subtree.includes(el) ||
        display.videos.subtree.includes(el))
    )

    let content = child = container
    while (child) { 
        content = child
        child = Array.from(content.children).find(el => el.innerText === content.innerText)
        content.style.margin = '0px'
        content.style.padding = '0px'
    } 

    content.style.margin = '5px'
    content.style.padding = '5px'
    container.style.margin = '5px'
    container.style.padding = '0px'

    console.log(container, content);

    let topDistance = content.getBoundingClientRect().top + document.documentElement.scrollTop
    if (topDistance < 30 && topDistance >= 0) {
        let n = 30 - topDistance
        content.style.paddingTop = content.style.paddingBottom = n + 'px'
    }
    let leftDistance = content.getBoundingClientRect().left + document.documentElement.scrollLeft
    if (leftDistance < 30 && leftDistance >= 0) {
        let n = 30 - leftDistance
        content.style.paddingLeft = content.style.paddingRight = n + 'px'
    }

    //document.body.style.backgroundColor = container.style.backgroundColor = window.getComputedStyle(content).backgroundColor
}


//// IN-DEVELOPMENT MODE FUNCTIONS - FEEDBACK
let errors = {                              // false positives and negatives
    'ing': { 'mistakes': [], 'misses': [] }, 
    'meth': { 'mistakes': [], 'misses': [] } 
}   

let lines = { 
    'ing': [],
    'meth': []
}

function getErrors() {
    /*
    Check for mismatches between RESULTS and the corresponding MATCH (Node) found for each type (Ingredients and Method)
    MISTAKES: false positives
    MISSED: false negatives
    */
    lines.ing = recipes.map(rec => correctLines(rec.ing.text)).flat().filter(line => line !== ''),
    lines.meth = recipes.map(rec => correctLines(rec.meth.text)).flat().filter(line => line !== '')

    for (let list of ['ing', 'meth']) {
        // MISTAKES
        for (let line of results[list].flat()) {
            if (!lines[list].flat().includes(line) && line !== '') {
                errors[list]['mistakes'].push(line)
            }
        }
        // MISSES
        for (let line of lines[list]) {
            if (!results[list].flat().includes(line) && line !== '') {
                errors[list]['misses'].push(line)
            }
        }
    }
}

function saveErrors() {
    getErrors()
    console.log('ERRORS:', errors)
    
    chrome.storage.local.get('feedback', f=> {
        let url = correctURL(window.location.href)
        let feedback = f.feedback || {
            'list': [], 
            'lines': {'ing': [], 'meth': []}, 
            'mistakes': {'ing': [], 'meth': []}, 
            'misses': {'ing': [], 'meth': []} 
        }

        if (feedback.list.includes(url)) { return }

        feedback.list.push(url)
        feedback.lines.ing.push(...lines.ing)
        feedback.lines.meth.push(...lines.meth)
        feedback.mistakes.ing.push(...errors.ing.mistakes)
        feedback.mistakes.meth.push(...errors.meth.mistakes)
        feedback.misses.ing.push(...errors.ing.misses)
        feedback.misses.meth.push(...errors.meth.misses)
        
        chrome.storage.local.set({ feedback });
    });
}

function displayFeedback() {
    chrome.storage.local.get('feedback', f=> {
        let feedback = f.feedback
        
        document.body.innerHTML = ''
        
        let p1 = document.createElement('p')
        p1.innerText = 'click to copy this text - ' 
        let copyBtn = document.createElement('button')
        copyBtn.innerText = 'COPY'
        p1.appendChild(copyBtn);
        
        let p2 = document.createElement('p')
        p2.innerText = 'Please send to - '
        let emailBtn = document.createElement('button')
        emailBtn.innerText = 'luisbsantos93@gmail.com'
        p2.appendChild(emailBtn)

        let content = document.createElement('div')
        content.id = "recipick-feedback"
        document.body.appendChild(p1)
        document.body.appendChild(p2)
        document.body.appendChild(content)
        document.body.style.margin = '50px'

        displayFeedbackLines(content, feedback.lines, 'lines')
        displayFeedbackLines(content, feedback.mistakes, 'mistakes')
        displayFeedbackLines(content, feedback.misses, 'misses')

        copyBtn.addEventListener("click", ()=> {
            navigator.clipboard.writeText(content.innerText);
        });
        emailBtn.addEventListener('click', ()=> { 
            window.open('mailto:luisbsantos93@gmail.com?subject=Recipick%20Feedback');
        });
    });
}

function displayFeedbackLines(content, list, listname) {
    content.innerText += '\ning_' + listname
    for (line of list.ing) {
        content.innerText += '\n' + line
    }
    content.innerText += '\n\n\n'
    content.innerText += '\nmeth_' + listname
    for (line of list.meth) {
        content.innerText += '\n' + line
    }
    content.innerText += '\n\n\n'
}

function resetFeedback() {
    chrome.storage.local.get('feedback', f=> {
        
        let feedback = f.feddback || { 'list': [] } 

        chrome.storage.local.set({ feedback: {
            'list': feedback.list, 
            'lines': {'ing': [], 'meth': []}, 
            'mistakes': {'ing': [], 'meth': []}, 
            'misses': {'ing': [], 'meth': []} 
        } });
    });
}

