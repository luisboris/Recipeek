class List {
    constructor(elements, type, listResults=undefined) {
        /** 'ing' or 'meth' */
        this.type = type; 
        this.elements = elements; 
        this.results = listResults || results[type];
        this.children = this.elements                                                          
            .reduce((array, el) => [...array, ...Array.from(el.children || el)], []);                 
        this.branch = getBranch(this.elements).branches;                                          
        this.ancestors = getBranch(this.elements).ancestors;
        this.text = this.elements.reduce((str, el) => `${str}\n${el.innerText}`, '');                         
        this.lines = correctLines(this.text);                                                   
        this.score = getScore(this.results, this.lines).listScore(this.elements, this.type);
    }
}
class Recipe {
    constructor(ingredients, method, index, recipeResults=results) {
        this.index = index;                                                       
        this.ing = ingredients;
        this.meth = method;
        this.results = recipeResults;
        if (this.ing && this.meth) {  // 2 LISTS
            if (this.ing.elements.every((el, i) => el === this.meth.elements[i])) {  // both LISTS are equal
                this.hasLists = false;
                this.lists = [];
                this.element = findCommonAncestor([this.ing])
            } else {
                this.hasLists = true;
                this.lists = [this.ing, this.meth];
                this.element = findCommonAncestor(this.lists)
            }
        } else {  // 1 LIST
            this.hasLists = false
            this.lists = [this.ing || this.meth]
            this.element = findCommonAncestor(this.lists)
        }
        this.descendants = this.element.querySelectorAll('*');      
        this.children = this.element.children;                      
        this.text = this.element.innerText;                         
        this.lines = correctLines(this.text);                       
        this.listLines = this.lists.reduce((array, list) => [...array, ...list.lines.filter(line => this.lines.includes(line))], []);
        this.score = getScore(this.results.all, this.lines).score;  
        this.listScore = this.lists.reduce((score, list) => score + list.score, 0)
    }
}

const UNITS = 'tsp|tsps|teaspoons|teaspoon|tbsp|tb|tbsps|tablespoons|tablespoon|cups|cup|c|lb|lbs|pounds|pound|pd|pds|ounce|ounces|oz|gram|grams|gr|g|kilogram|kilograms|kgs|kg|miligram|miligrams|mg|mgs|ml|mls|mililitre|mililiter|mililitres|mililiters|cl|cls|centiliter|centilitre|centiliter|centilitre|dl|dls|decilitre|deciliter|decilitres|deciliters|l|ls|litres|liters|litre|liter|fl oz|quarts|quart|qt|gallons|gallon|pints|pint|inch|inches|in|cm|cms|centimeter|centimetre|centimeters|centimetres|mm|mms|milimitre|milimiter|milimitres|milimiters|large|small|medium|bunch|handfull|pinch|sprinkle'
const NUMBERS = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
/** To find quantities, include: fractions ("2/3 lemon"), ranges ("2-3 lemons"), decimals ("2,3 lemons / 2.3 lemons") */
const NUMBER_TEMPLATE = `(${NUMBERS})(([ ,./-])(${NUMBERS}))?`
/** single line with only NUMBER */
const PATTERN_N = `^${NUMBER_TEMPLATE} ?$`                             
/** single line with only NUMBER + UNIT */
const PATTERN_N_U = `^${NUMBER_TEMPLATE}.{0,2}(${UNITS})[^a-zA-Z]*$`
/** LIST titles */
const TITLES = {
    'ing': ['ingredients'],
    'meth': ['procedure', 'preparation', 'method', 'instructions', 'steps', 'directions']
}

/** Boolean -> UI frame visible or not */
let frameDisplay = false
/** Boolean -> received results from predict.js or not */
let hasRecipe           
/** Object -> LINES identified by predict.js */
let results             
/** Array of RECIPE Objects */
let recipes     
/** length: number of RECIPES; lists (array): each RECIPE hasLists Boolean */                              
let recipesInfo = {}
/** various info about how the page is currently being displayed */
let display = {         
    
    'body': document.body,      

    'text': document.body.innerText,

    /** current Elements in display */ 
    'focused': [document.body],                                  

    /** if it's currently displaying the original PAGE, the RECIPE or a single LIST (and which one) */
    'type': 'page',  

    /** RECIPE(S) currently in display */
    'recipes': [],                           

    /** current type of Display -> single: display the RECIPE Element; multi: only display the LISTS */
    'focus': 'single',
    
    /** assign index to every Element of document.body */
    'getIndexes': function() {
        return Array.from(document.body.querySelectorAll('*')).reduce((total, element, i) => {
            element.dataset.recipeekIndex = i;
            return Object.assign(total, {[i]: element})
        }, {})
    },
    
    /** HTML Elements that are not to change display properties */
    'getUnchanged': function() {
        return Array.from(document.body.querySelectorAll('path, style, script'))
    },
    
    'getImageContainers': function() {
        let elements = Array.from(document.body.querySelectorAll('*')).filter(el => 
            el.tagName.toLowerCase().match(/image|img|figure|picture/) || 
            typeof el.href === 'string' && el.href.match(/(\.jpg|\.png|\.gif|\.bmp)$/) ||
            el.style.backgroundImage !== ''
        );
        
        let containers = elements.reduce((total, element) => { 
            let height = window.getComputedStyle(element).height
            while (element.parentNode.innerText === '' || window.getComputedStyle(element.parentNode).height === height) { 
                element = element.parentNode 
            }
            return [...total, element] 
        }, [])
        .filter((el, i, array) => array.indexOf(el) === i);  // avoid repetetions

        let subtree = containers.reduce((total, element) => {
            return [...total, ...Array.from(element.querySelectorAll('*'))]
        }, [])
        .filter((el, i, array) => array.indexOf(el) === i);  // avoid repetetions

        return { elements, containers, subtree }
    },

    'getVideoContainers': function() {
        let elements = Array.from(document.body.querySelectorAll('*')).filter(el => 
            el.tagName.toLowerCase() === 'video' || 
            Array.from(el.attributes).find(att => att.name.match('src') && att.value.match('youtube.com'))
        );
        
        let containers = elements.reduce((total, element) => { 
            let height = window.getComputedStyle(element).height
            while (element.parentNode.innerText === '' || window.getComputedStyle(element.parentNode).height === height) { 
                element = element.parentNode 
            }
            return total.includes(element) ? total : [...total, element] 
        }, [])

        let subtree = containers.reduce((total, container) => {
            return [...total, ...Array.from(container.querySelectorAll('*'))]
        }, [])
        .filter((el, i, array) => array.indexOf(el) === i);

        return { elements, containers, subtree }
    },

    /** HTML Elements with no text/image/video content currently in display */
    get empties() { 
        return display.branch.filter(el => 
            el.innerText === '' && 
            ![...display.images.subtree, ...display.images.containers].includes(el) && 
            ![...display.videos.subtree, ...display.videos.containers].includes(el) && 
            el.parentNode.querySelectorAll('svg, a').length === 0
        )
    },
    
    /** return the BRANCH of the Elements currently in display */
    get branch() { return getBranch(this.focused).branches },

    //** All Elements from User Interaction frame */
    get frameElements() { return Array.from(frame.element.querySelectorAll('*')) }
}
/** User Interaction frame to stick on top of Page */
let frame = {
    /** User Interaction frame to stick on top of Page */
    element: document.createElement('div'),
    /** to display extension name */
    title: document.createElement('div'),
    /** to display info to User */
    info: document.createElement('div'),
    /** User Interaction Buttons */
    ui: document.createElement('div'),
    /** buttons to Display RECIPES of LISTS by user */
    recipeButtons: document.createElement('div'),
    /** copy, print, etc. */
    secondaryButtons: document.createElement('div'),
    /** to display user's preferences */
    options: document.createElement('div'),
    /** pages saved by user */
    savedPages: document.createElement('div'),
    /** Animation do display while loading */
    loading: document.createElement('div')
}



insertFrame()

// wait for document to finish loading
if (document.readyState !== 'complete') { 
    window.addEventListener('load', () => { main() });
} else { main() }


//// MAIN FUNCTIONS ////
function main() {

    chrome.runtime.sendMessage({   // message to predict.js
        message: "innerText", 
        text:  document.body.innerText, 
        url: window.location.href
    });

    chrome.runtime.onMessage.addListener(request => {
        // message from background.js when Extension Icon is clicked -> confirm this file is loading/loaded
        if (request.message === 'you there?') { toggleFrame() }

        // message from predict.js with prediction RESULTS
        if (request.message === 'results') { processResults(request.results) }
    });

    setDisplayProperties()  

    updateDisplay()
}

function setDisplayProperties() {

    // if more Elements were loaded into document.body we need to include in display actions
    if (!display.indexes || Object.keys(display.indexes).length < Array.from(document.body.querySelectorAll('*')).length) {
        display.body = document.body;
        display['indexes'] = display.getIndexes()
    }

    let currentUnchanged = display.getUnchanged()
    if (!display.unchanged || currentUnchanged !== display.unchanged) {
        display['unchanged'] = currentUnchanged
    }

    let currentImages = display.getImageContainers()
    if (!display.images || currentImages.elements.length !== display.images.elements.length) {
        display['images'] = currentImages
    }
    
    let currentVideos = display.getVideoContainers()
    if (!display.videos || currentVideos.elements.length !== display.videos.elements.length) {
        display['videos'] = currentVideos
    }
}

function processResults(resultsReceived) {
    results = resultsReceived
    if (!results) { 
        hasRecipe = false 
        displayFail('results undefined');
        return
    }

    let singleRecipe = findRecipe(document.body, results);         
    let multipleRecipes = findMultipleRecipes();                   

    if (!singleRecipe && !multipleRecipes) { 
        hasRecipe = false
        displayFail('no recipe found');
        return
    }
    else if (singleRecipe && multipleRecipes) {
        let singleScore = Math.max(singleRecipe.score, singleRecipe.listScore)
        let multipleScore = multipleRecipes.reduce((score, recipe) => score + recipe.listScore, 0) / multipleRecipes.length
    } 
    else { 
        recipes = multipleRecipes || [singleRecipe] 
    }

    hasRecipe = true

    recipesInfo = { 'length': recipes.length, 'lists': recipes.map(recipe => recipe.hasLists) }

    createRecipeButtons(recipesInfo)
    
    setOptions()
}

/** Find Ingredients and Method Lists inside the given HTML Element.  
 * Create a RECIPE Object with these lists.  
 * To get a better result, make a second search within the scope of this first RECIPE */
 function findRecipe(element, currentResults, recipeIndex=0) {
    let ingList = findListElement(element, currentResults.ing, 'ing');
    let methList = findListElement(element, currentResults.meth, 'meth');                    
    if (!ingList && !methList) { return null }

    let firstRecipe = new Recipe(ingList, methList, recipeIndex); 
    let newRecipe = findListsWithin(firstRecipe, currentResults, recipeIndex);       

    return newRecipe || firstRecipe


    /** Search document and find the HTML Element with the highest correspondence with the RESULTS for a given LIST */
    function findListElement(parent, listResults, type) {   
        let bestMatch = { 'element': null, 'score': 0 }
        
        for (let element of parent.querySelectorAll('*')) {
            // avoid contentless or not visible Elements
            if (!element.innerText || element.offsetHeight === 0 || display.unchanged.includes(element)) { continue }  
            
            let elementLines = correctLines(element.innerText)
            if (elementLines.length === 0) { continue }

            let score = getScore(listResults, elementLines).listScore([element], type)
            if (score > bestMatch.score) { bestMatch = {element, score} }
        }

        if (!bestMatch.element) { return null }

        return new List([bestMatch.element], type)
    }
}

/** Find best match for each LIST within scope of RECIPE Element */
function findListsWithin(recipe, currentResults, recipeIndex) { 
    let recipeLines = recipe.lines
    let index = {
        ing: recipeLines.findIndex(line => TITLES['ing'].find(title => line.startsWith(title))),
        meth: recipeLines.findIndex(line => TITLES['meth'].find(title => line.startsWith(title))),
        notes: recipeLines.findIndex(line => line.startsWith('notes'))
    }

    let first = findListElements();                                                             
    let second = findListElementsGroup();                                                       

    let newRecipe
    if (!first.recipe && !second.recipe) { 
        whichRecipe = '1' 
        newRecipe = null
    } else if (first.score >= second.score) { 
        whichRecipe = '2' 
        newRecipe = first.recipe
    } else { 
        whichRecipe = '3' 
        newRecipe = second.recipe
    }                                                                                                  
    return newRecipe


    /** Find a single HTML Element for each List (the one who has more LINES from RESULTS in its innerText) */
    function findListElements() {
        let lists = { 
            ing: { element: null, score: 0, lines: [] }, 
            meth: { element: null, score: 0, lines: [] } 
        }

        for (let type in lists) {
            let listResults = currentResults[type]
            if (listResults.length === 0) { continue }  // only 1 LIST
            
            let bestMatch = { element: null, score: 0, lines: [] }
            for (let element of recipe.descendants) {
                // avoid contentless or not visible Elements
                if (!element.innerText || element.offsetHeight === 0 || display.unchanged.includes(element)) { continue }  

                let elementLines = correctLines(element.innerText)
                if (elementLines.length === 0) { continue }

                let score = getScore(listResults, elementLines).listScore([element], type)

                if (score > bestMatch.score) { bestMatch = {element, score, lines: elementLines} }
            }
            lists[type] = bestMatch
        }

        let ingList = lists.ing.element ? new List([lists.ing.element], 'ing', currentResults.ing) : null
        let methList = lists.meth.element ? new List([lists.meth.element], 'meth', currentResults.meth) : null
        let newRecipe = (ingList || methList) ? new Recipe(ingList, methList, recipeIndex, currentResults) : null
        let score = newRecipe ? Math.max(newRecipe.score, newRecipe.listScore) : 0  // TODO: average or MAX??

        return { recipe: newRecipe, score }   
    }

    /** Search for a group of Elements that contain each LIST 
     * (in some cases, the LISTS are not contained in a single Element).  
     * Try finding by TITLE. If there are no TITLES, find the Elements that contain the LINES from RESULTS, from first to last.  
     * Return the group with highest score */
    function findListElementsGroup() {
        let recipeLines = recipe.lines
        let textElements = getTextElements()
        let lists = {}
        let list1, list2

        let firstScore = (index.ing > -1 && index.meth > -1) ? findByTitles() : 0
        findByResults()

        let ingList = lists.ing ? new List(lists.ing, 'ing') : null
        let methList = lists.meth ? new List(lists.meth, 'meth') : null
        let newRecipe = (ingList || methList) ? new Recipe(ingList, methList, recipeIndex, lists.results) : null
        let score = newRecipe ? Math.max(newRecipe.score, newRecipe.listScore) : 0  // TODO: average or MAX??
        
        return { recipe: newRecipe, score } 


        /** Filter RECIPE Elements which have no text and return only one Element for each LINE or group of LINES (that is, no Element should contain a LINE that is in another) */
        function getTextElements() {
            let allElements = Array.from(recipe.descendants)
            let textElements = allElements.filter((element, i, array) => {
                if (!element.innerText || display.unchanged.includes(element)) { return false }
        
                let elementLines = correctLines(element.innerText)
                if (!recipeLines.includes(elementLines[0])) { return false }
                if (elementLines.length === 1) { 
                    return i === array.findIndex(el => element.innerText === el.innerText)  // no duplicates; return uppermost element
                }
                else {  // make sure these lines are not divided amongst Element's children
                    let children = Array.from(element.children)
                    // there is at least one child with at least one line included in Element lines
                    return !children.find(child => correctLines(child.innerText).find(l => elementLines.includes(l)))
                }
            });
            return textElements
        }

        /** If there are both TITLES divide Results and RECIPE Elements for each LIST.  
         * Return average Score */
        function findByTitles() {
            let newResults = { ing: currentResults.ing, meth: currentResults.meth, all: currentResults.all }
            let lines1 = [], array1 = [], lines2 = [], array2 = [] 
            
            if (index.ing < index.meth) { list1 = 'ing'; list2 = 'meth' }
            else { list1 = 'meth'; list2 = 'ing' }
            
            lines1 = recipeLines.slice(index[list1], index[list2])
            newResults[list1] = newResults[list1].filter(res => lines1.includes(res)) 
            lines2 = (index.notes > -1) ? recipeLines.slice(index[list2], index.notes) : recipeLines.slice(index[list2])
            newResults[list2] = newResults[list2].filter(res => lines2.includes(res)) 
            
            // delete last lines which don't belong in any List
            for (let i = lines2.length-1, lastLine = lines2[i]; !newResults[list2].includes(lastLine) && i > 0; i--) {  
                lines2.pop()
                lastLine = lines2[i-1]
            }

            let length = textElements.length
            let n = 0  // to iterate through 'textElements'

            let copy1 = lines1.slice(1)
            let first1 = lines1[0]
            let len1 = lines1.length
            for (let j = 0; j < len1 && n < length; n++) {  // j: to iterate through elementLines
                let elementLines = correctLines(textElements[n].innerText)
                if (elementLines[0] === first1) {     // in case 1st Element it is repeated (e.g.: "Ingredients" is in an index before Ingredients List)
                    array1 = [textElements[n]];       // start all over again
                    j = elementLines.length
                    copy1 = lines1.slice(1)
                }
                else if (array1.length > 0) {
                    if (copy1.includes(elementLines[0])) {
                        array1.push(textElements[n]);
                        j += elementLines.length
                    }
                    else {
                        array1 = []
                        j = 0
                    }
                }
            }
            
            let copy2 = lines2.slice(1)
            let first2 = lines2[0]
            let len2 = lines2.length
            for (let j = 0; j < len2 && n < length; n++) {
                let elementLines = correctLines(textElements[n].innerText)
                if (elementLines[0] === first2) {  
                    array2 = [textElements[n]];  
                    j = elementLines.length
                    copy2 = lines2.slice(1)
                }
                else if (array2.length > 0) {
                    if (copy2.includes(elementLines[0])) {
                        array2.push(textElements[n]);
                        j += elementLines.length
                    }
                    else {
                        array2 = []
                        j = 0
                    }
                }   
            } 
                                                                                        
            lists = { 
                [list1]: (array1.length > 0) ? array1 : null, 
                [list2]: (array2.length > 0) ? array2 : null,
                results: newResults
            }

            let score1 = getScore(currentResults[list1], lines1).listScore(array1, list1)
            let score2 = getScore(currentResults[list2], lines2).listScore(array2, list2)
            
            return (score1 + score2) / 2
        }

        /** Search RECIPE Elements and save them starting from the first that contains the first LINE of RESULTS until the one who contains the last LINE. */
        function findByResults() {
            let newResults = { ing: currentResults.ing, meth: currentResults.meth, all: currentResults.all }
            if (index.ing > -1 || index.meth > -1) {  // only one TITLE - filter RESULTS
                let listFound = (index.ing > -1) ? 'ing' : 'meth'
                let slicedLines = recipeLines.slice(index[listFound])
                newResults[listFound] = newResults[listFound].filter(res => slicedLines.includes(res))
                newResults.all = newResults.all.filter(res => newResults.ing.includes(res) || newResults.meth.includes(res))
            }

            // LIST order
            if (newResults.ing.includes(newResults.all[0])) { list1 = 'ing'; list2 = 'meth' }
            else { list1 = 'meth'; list2 = 'ing' }

            let first, second
            let lines1 = [], lines2 = []
            let score1 = 0, score2 = 0, avgScore = 0
            let bestCombo = { array1: null, lines1: [], array2: null, lines2: [], score: 0 }

            // first LIST
            for (let i = 0; i < textElements.length; i++) {
                
                let elementLines = correctLines(textElements[i].innerText)
                if (elementLines.length === 0) { continue }

                /** Where does the first LIST start?: in the Element which has the first LINE from RESTULS or a TITLE.
                 * Give precedence to TITLE */
                if (!first && elementLines.includes(newResults.all[0])) {
                    first = [i, textElements[i]]
                }
                if (TITLES[list1].find(title => elementLines[0].startsWith(title))) {
                    first = [i, textElements[i]]
                    lines1 = []  // empty array to start again from scratch
                }
                if (!first) { continue }

                lines1.push(...elementLines)
                array1 = textElements.slice(first[0], i+1)
                
                // only 1 LIST
                if (newResults[list2].length === 0) { 
                    score1 = getScore(newResults[list1], lines1).listScore(array1, list1)
                    if (score1 > bestCombo.score) { 
                        bestCombo = { array1, lines1, array2: null, lines2: [], score: score1 }
                    }
                    continue 
                }
                
                // second LIST
                lines2 = []
                second = [i+1, textElements[i+1]]
                for (let j = second[0]; j < textElements.length; j++) {
                    let elementLines2 = correctLines(textElements[j].innerText)
                                
                    lines2.push(...elementLines2)
                    if (lines2.length === 0) { continue }    

                    array2 = textElements.slice(second[0], j+1)

                    score1 = getScore(newResults[list1], lines1).listScore(array1, list1)
                    score2 = getScore(newResults[list2], lines2).listScore(array2, list2)
                    
                    // if Element's lines are in both RESULTS, 
                    let repeats = results.repeated
                    if (repeats.length > 0) {
                        repeats.forEach((rep, i) => {
                            if (lines2.includes(rep)) { 
                                let proportion = results.repScores[i].meth / results.repScores[i].ing
                                score2 = (list1 === 'ing') ? (score2 * proportion) : (score2 / proportion)
                            }
                        }); 
                    }

                    avgScore = (score1 + score2) / 2

                    if (avgScore > bestCombo.score) { 
                        bestCombo = { array1, lines1, array2, lines2, score: avgScore }
                    }
                }
            }

            if (avgScore > firstScore) { 
                lists = { 
                    [list1]: bestCombo.array1, 
                    [list2]: bestCombo.array2,
                    results: newResults 
                }
            }
        }
    }
}

/** Search for repeated Titles. Find the HTML Elements that contain each of those repetitions.  
 * Divide the RESULTS for each Recipe */
function findMultipleRecipes() {
    
    let repeats = findRepeatedTitles()
    if (!repeats) { return null }

    let recipeElements = findRecipesByTitles(repeats)

    let ingResults = [...results.ing]
    let methResults = [...results.meth]

    let newResults = recipeElements.map(element => { 
        let elementLines = correctLines(element.innerText)
        let res = { 'ing': [], 'meth': [], 'all': [] }

        let currentList = repeats.order[0]

        // Get all the Lines from this Element which are in RESULTS, avoiding repetitions 
        // (the titles should be repeated and some ingredients might be in more than one recipe)
        for (let line of elementLines) {
            if (line.startsWith(repeats.titles[1])) {  // second LIST Title is found
                currentList = repeats.order[1] 
            }
            if (results[currentList].includes(line) && !res[currentList].includes(line)) {
                res[currentList].push(line)
                res['all'].push(line)
            }
        }

        // delete lines already found
        ingResults = ingResults.filter(result => !res.ing.includes(result))
        methResults = methResults.filter(result => !res.meth.includes(result))
        
        return res
    });

    // find each RECIPE based on new (divided) RESULTS, filter nulls
    let recipes = recipeElements.map((element, i) => findRecipe(element, newResults[i], i)).filter(recipe => recipe)

    return (recipes.length > 0) ? recipes : null


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
        
        // exclude repetitions
        order = order.filter((value, i) => order.indexOf(value) != order.lastIndexOf(value) && order.indexOf(value) === i)
    
        return { titles, order }
    }
    
    /** Search the Document's innerText for patterns of the repeated TITLES (regex example: /ingredients.+?instructions/).     
     * Find the deepest Element that contains each match in its innerText */
    function findRecipesByTitles(repeats) {
        let re_string = repeats.titles.reduce((str, title) => str + title + '.+?', '').replace(/\.\+\?$/, '')
        let re = new RegExp(re_string, 'gs')
        let matches = document.body.innerText.toLowerCase().match(re)
    
        let finds = matches.map(match => {
            let deepest = document.body
            while (true) {
                let children = Array.from(deepest.children)
                let deeper = children.find(el => el.innerText && el.innerText.toLowerCase().includes(match))
                if (!deeper) { break }
                deepest = deeper
            }
            return deepest
        });
    
        return finds
    }
}


//// SECONDARY FUNCTIONS ////
function displayFail(message) {
    frame.info.innerText = 'no recipe found :('
    throw new Error(message)
}

/** Delete # and fragment identifier from URL */
function correctURL(url) {
    return url.replace(/#.*/, '')
}

/** Divide the text in lines and delete empty lines, doubles spaces and symbols at the beggining of line.  
 * Search for list entries which are broken in different lines (e.g: "2\nlemons", "1 cup\nwater")
 * and concatenate them in a single line.  
 * Return an array with corrected lines */
function correctLines(text) {
    if (!text) { return [] }

    let lines = text.toLowerCase().replaceAll(/^[^\w¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/gm, '').replaceAll('\n\n', '\n').replaceAll(/ +/g, ' ').split('\n')
    
    let correctedLines = []
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].search(PATTERN_N) !== -1 || lines[i].search(PATTERN_N_U) !== -1) {  // pattern broken in 2 lines
            let two = `${lines[i]} ${lines[i+1]}`.replaceAll('  ', ' ')  // ensure a single space between concatenated lines
            correctedLines.push(two)
            i++
        }
        else if (lines[i].match(/\w/)) {  // no pattern - avoid empty lines
            correctedLines.push(lines[i]) 
        }
    }
    return correctedLines
}

/** Calculate the proportion between matches and errors (false positives and negatives). Apply a formula to calculate ListScore 
 * score + (score * ulDensity) * 0.5 + (score * olDensity) * 0.5 + (score * titleScore) + (score * classes) */
function getScore(results, lines) {
    let copy = [...results]
    let matched = 0
    for (let line of lines) {
        if (copy.includes(line)) { 
            copy.splice(copy.indexOf(line), 1)  // delete matches from list to avoid false repetetitions
            matched++ 
        }
    }
    let resultsScore = (matched / results.length) || 0
    let elementScore = (matched / lines.length) || 0
    let score = resultsScore * elementScore
    
    return { 
        score,
        listScore: function(elements, type) {
            let count = elements.length

            // percentage of Elements (among parent, self and children) that are a HTML list type
            let ulDensity = elements.filter(el => 
                el.parentNode.tagName.toLowerCase() === 'ul' || 
                el.tagName.toLowerCase() === 'ul' ||
                Array.from(el.children).find(child => child.tagName.toLowerCase() === 'ul')
            ).length / count
            let olDensity = elements.filter(el => 
                el.parentNode.tagName.toLowerCase() === 'ol' || 
                el.tagName.toLowerCase() === 'ol' ||
                Array.from(el.children).find(child => child.tagName.toLowerCase() === 'ol')
            ).length / count
            if (type === 'meth') { olDensity *= 2 }

            let titleScore = (TITLES[type].find(title => lines[0].startsWith(title))) ? 0.75 : 0
            let otherType = (type === 'ing') ? 'meth' : 'ing'
            if (TITLES[otherType].find(title => lines.find(line => line.startsWith(title)))) { titleScore -= 0.75 }

            // Elements that contain a TITLE in one of their CSS Classes
            let classes = elements.filter(el => 
                Array.from(el.classList).find(cl => TITLES[type].find(title => cl.includes(title)))
            ).length / count

            let newScore = score + (score*ulDensity)*0.5 + (score*olDensity)*0.5 + (score*titleScore) + (score*classes)

            return newScore
        }
    }
}

/** Find the Element that is present in every BRANCH of each LIST, closest to their Elements.   
 * This Element must contain all of the former (it might be one of them). */
function findCommonAncestor(lists) {
    let listsElements = lists.reduce((array, list) => [...array, ...list.elements], [])
    let branches = lists.map(list => list.branch)
    let ancestor = document.body
    for (let twig of branches[0]) {
        if (branches.every(branch => branch.includes(twig))) { 
            // every LIST Element is not a descendant of this twig
            if (listsElements.every(el => Array.from(twig.querySelectorAll('*')).includes(el) || el === twig)) {
                ancestor = twig 
            }
            else if (listsElements.includes(twig)) { break }  // it's one of them
        }
        else { break }
    }
    return ancestor
}

/** Given an array of HTML Elements, return an array of their Ancestors and an array with the complete BRANCH (from ancestor to descendants), both of them in descending order. */
function getBranch(elements) { 
    let ancestors = []
    let branches = []
    for (let element of elements) {
        let trunk = [element]
        let temp = element
        while (temp !== document.documentElement) {
            if (!ancestors.includes(temp)) { trunk.unshift(temp) }
            temp = temp.parentNode;
        }
        ancestors.push(...trunk)
        branches.push(...trunk, ...element.querySelectorAll('*'))
    }                                
    return { branches, ancestors }
}

/** Given an HTML Element, return the deepest Element (furthest away from document.documentElement) with the same innerText */
function deepestNode(element) {
    if (element === null) { return }

    let deepest = element
    while (true) {
        let children = Array.from(deepest.children)
        let deeper = children.find(el => el.innerText && el.innerText === deepest.innerText)
        if (!deeper) { break }
        deepest = deeper
    }
    return deepest
}

/** Get the DEEPNESS (distance from document.documentElement) and vertical POSITION (in the Elements order) of a given HTML Element */
function elementPosition(element) {
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

/** Copy the Text being displayed, after editing unwanted symbols, spaces and frame content */
function copyContent() {
    let content = document.body.innerText.replace(/RECIPICK.+/s, '')
    .replaceAll(/^[^\w¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/gm, '').replaceAll('\n\n', '\n').replaceAll(/ +/g, ' ')
    
    navigator.clipboard.writeText(content)
}


//// FUNCTIONS THAT CHANGE PAGE DISPLAY ////
/** When user clicks a RECIPE button */
function focusRecipe(recipes) {
    display.type = 'recipe'

    display.focused = (display.focus === 'single') ? 
        recipes.map(rec => rec.element) :
        recipes.map(rec => [...rec.ing.elements, ...rec.meth.elements]).flat()

    updateDisplay()
}

/** When user clicks a LIST button */
function focusList(recipeIndex, list) {
    display.type = list
    display.focused = recipes[recipeIndex][list].elements
    updateDisplay()
}

/** Reassign original display values */
function reset() {
    display.type = 'page'
    display.focused = [display.body]
    updateDisplay()
}

/** Change what RECIPE to display (if index === -1: display all) */
function toggleRecipes(recipeIndex, Focus=true) {
    display.recipes = (recipeIndex === '-1') ? recipes : [recipes[recipeIndex]]
    if (Focus === true) { focusRecipe(display.recipes) }
}

function updateDisplay() {
    chrome.storage.sync.get('options', data => {
        let options = data.options
        let branch = display.branch
        let empties = display.empties
        let frameElements = display.frameElements
        frameElements.push(frame.element)

        display.focus = (options['focus'] === '1') ? 'single' : 'multi'

        for (let element of document.body.querySelectorAll('*')) {
            
            if (display.unchanged.includes(element) 
            || display.videos.subtree.includes(element)  // do not mess with video Elements - can screw up Video controls
            || frameElements.includes(element)) { 
                continue 
            }

            if (!element.dataset.recipeekDisplay) {  // Element not yet labeled
                element.dataset.recipeekDisplay = window.getComputedStyle(element).display
                element.dataset.recipeekHeight = window.getComputedStyle(element).height
                element.dataset.recipeekMinHeight =  window.getComputedStyle(element).minHeight
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
    });
}

/** Display a RECIPE or a LIST, depending on user click
 * @param {number} type corresponding to display.focus */
function recipeDisplay(choice) {
    if (choice === '1') { display.focus = 'single' }
    else { display.focus = 'multi' }

    if (display.type === 'recipe') { focusRecipe(recipes) }
    else if (display.type !== 'page') { focusList(0, display.type) }
}

/** collapse Elements with no content */
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

/** Toggle Element's display (between original value and 'none') */
function toggleElement(element, choice, branch) {
    if (choice === 'on' || !branch.includes(element)) { 
        element.style.display = 'none' 
    } else { 
        element.style.display = element.dataset.recipeekDisplay 
    }
}


//// FUNCTIONS TO CREATE/MODIFY FRAME ////
//** Dinamically create HTML frame content */
function insertFrame() {
    frame.element.classList.add('recipick-frame')
    frame.title.classList.add('recipick-title')
    frame.info.classList.add('recipick-info')
    frame.recipeButtons.classList.add('recipick-buttons')
    frame.secondaryButtons.classList.add('recipick-buttons-2')
    frame.options.classList.add('recipick-options')
    frame.savedPages.classList.add('recipick-saved')

    frame.title.innerText = 'RECIPICK'
    createButton(frame.title, 'x', 'close', 'close')
    
    frame.info.appendChild(frame.loading)
    frame.loading.innerHTML = `<div><strong>Loading...</strong><img src="${chrome.runtime.getURL('images/spinner.gif')}" style="height: 30px;"></div>`
    
    if (window.location.protocol === 'https:') { createButton(frame.secondaryButtons, 'COPY', 'copy') }  // no clipboard in http
    createButton(frame.secondaryButtons, 'PRINT', 'print')
    frame.secondaryButtons.appendChild(document.createElement('div'))
    createButton(frame.secondaryButtons, 'OPTIONS', 'options', 'options-button')
    createButton(frame.secondaryButtons, 'Saved Pages', 'saved', 'saved-button')

    frame.ui.appendChild(frame.recipeButtons)
    frame.ui.appendChild(frame.secondaryButtons)
    
    const singleFocusRadio = document.createElement('div')
    singleFocusRadio.innerHTML = `<input type="radio" value="focus" id="1" name="recipe-display"><label for="display1">Display Entire Section</label>`
    const multiFocusRadio = document.createElement('div')
    multiFocusRadio.innerHTML = `<input type="radio" value="focus" id="2" name="recipe-display"><label for="display2">Display only Ingredients and Method</label>`
    const imageCheck = document.createElement('div')
    imageCheck.innerHTML = `<input type="checkbox" value="images" name="images"><label for="images">Hide Images</label>`
    const videoCheck = document.createElement('div')
    videoCheck.innerHTML = '<input type="checkbox" value="videos" name="videos"><label for="videos">Hide Videos</label>'
    frame.options.appendChild(singleFocusRadio)
    frame.options.appendChild(multiFocusRadio)
    frame.options.appendChild(imageCheck)
    frame.options.appendChild(videoCheck)
    for (let input of frame.options.querySelectorAll('input')) { input.addEventListener('change', i => handleClick(i))}

    createPageList()

    frame.element.appendChild(frame.title)
    frame.element.appendChild(frame.info)
    frame.element.appendChild(frame.ui)
    frame.element.appendChild(frame.options)
    frame.element.appendChild(frame.savedPages)
    document.body.appendChild(frame.element)
    
    for (let element of frame.element.querySelectorAll('*')) { element.classList.add('recipick') }
    
    frameDisplay = true
}

/** List of user's saved pages */
function createPageList() {
    frame.savedPages.innerHTML = ''  
    
    let firstLine = document.createElement('div')
    let title = document.createElement('p')
    title.innerText = 'Saved Pages'
    firstLine.appendChild(title)
    createButton(firstLine, 'Save this Page', 'save')

    let ul = document.createElement('ul')
    
    frame.savedPages.appendChild(firstLine)
    frame.savedPages.appendChild(ul)

    chrome.storage.sync.get('saved', (lib) => {  // user's saved pages list
        if (!lib.saved) { return }
        
        let pages = lib.saved
        for (let pagename in pages) {
            let li = document.createElement('li');

            let deleteBtn = createButton(li, 'x', 'delete', 'delete')
            deleteBtn.name = pagename

            let hyperlink = document.createElement('a')
            hyperlink.innerText = (pagename !== '') ? pagename : `untitled (${pages[pagename][0]})`
            hyperlink.href = pages[pagename][0]
            hyperlink.target = "_blank" 
            hyperlink.rel = "noopener noreferrer"
            li.appendChild(hyperlink)

            ul.appendChild(li)
        }

        for (let element of frame.savedPages.querySelectorAll('*')) { element.classList.add('recipick') }
    });
}

/** Creates Radio Buttons to display each RECIPE and respective LISTS */
function createRecipeButtons(info) {
    frame.loading.style.display = 'none'
    frame.secondaryButtons.style.display = 'flex'

    const rec0 = document.createElement('div')
    frame.recipeButtons.appendChild(rec0)
    createButton(rec0, 'reset', 'reset')

    if (info.length > 1) { createButton(rec0, 'Show All', 'recipes', -1) }  // multiple RECIPES

    for (let i in info.lists) {  // for each RECIPE
        let rec = document.createElement('div')
        frame.recipeButtons.appendChild(rec)
        
        let index = parseInt(i)+1
        createButton(rec, `Recipe #${index}`, 'recipes', i)
        
        if (info.lists[i]) {  // if there are LISTS
            createButton(rec, 'Ingredients', 'recipes.ing', i)
            createButton(rec, 'Instructions', 'recipes.meth', i)
        }
    }
    for (let element of frame.recipeButtons.querySelectorAll('*')) { element.classList.add('recipick') }
}

/** 
 * @param {*} parent Element on which to append button 
 */
function createButton(parent, text, value, id=0, classes=undefined) {
    let button = document.createElement('button');
    button.type = 'button'
    button.value = value
    button.id = id
    button.innerText = text
    if (classes) { button.classList.add(...classes) }
    button.addEventListener('click', b => handleClick(b));

    parent.appendChild(button)

    return button
}

//** manage each click from user in a Button/Checkbox in FRAME */
function handleClick(input) {
    let parameter = input.target.value
    let choice = input.target.id

    switch (parameter) {
        case 'close': toggleFrame()
            break
        case 'reset': reset()
            break
        case 'recipes': toggleRecipes(choice) 
            break
        case 'recipes.ing': focusList(choice, 'ing') 
            break
        case 'recipes.meth': focusList(choice, 'meth') 
            break
        case 'copy': copyContent()
            break
        case 'print': window.print()
            break
        case 'options': toggleSection(frame.options)
            break
        case 'focus': updateOptions(parameter, choice)
            break
        case 'videos':
        case 'images':  
            choice = input.target.checked ? 'on' : 'off'
            updateOptions(parameter, choice)
            break
        case 'saved': toggleSection(frame.savedPages)
            break
        case 'save': handlePagelist(parameter)
            break
        case 'delete': handlePagelist(parameter, input.target.name)
            break
    }
}

/** Check/uncheck HTML inputs based on user's preferences */
function setOptions() {
    chrome.storage.sync.get('options', data => {
        let options = data.options
        for (let input of frame.options.querySelectorAll('input')) {
            if (input.type === 'checkbox') { options[input.value] === 'on' ? input.checked = true : input.checked = false }
            if (input.type === 'radio') { input.id === options.focus ? input.checked = true : input.checked = false }
        }
    });
}
 
/** Store user's preferences */
function updateOptions(parameter, choice) {
    chrome.storage.sync.get('options', (data)=> {
        let options = data.options
        options[parameter] = choice

        chrome.storage.sync.set({ options }, ()=> {
            (parameter === 'focus') ? recipeDisplay(choice) : updateDisplay() 
        });
    });
}

/** Hide or show FRAME */
function toggleFrame() {
    if (frameDisplay) {
        frame.element.style.display = 'none'
        frameDisplay = false
    } else {
        frame.element.style.display = 'block'
        frameDisplay = true
    }
}

/** Hide or show OPTIONS or SAVED PAGES div */
function toggleSection(section) {
    let otherSection = (section === frame.options) ? frame.savedPages : frame.options 
    if (section.style.display !== 'flex') {
        section.style.display = 'flex' 
        otherSection.style.display = 'none'
    } else {
        section.style.display = 'none'
    }
}

/** When user adds or deletes from Saved Pages */
function handlePagelist(action, pagename=document.title) {
    chrome.storage.sync.get('saved', (lib) => {
        let saved = lib.saved || {}

        action === 'save'
            ? saved[pagename] = [window.location.href, window.location.hostname]
            : delete saved[pagename]

        chrome.storage.sync.set({ saved })

        createPageList()
    });
}