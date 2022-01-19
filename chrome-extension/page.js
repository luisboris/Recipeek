const start = Date.now()

const NUMBERS = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
const NUMBER_RE = `(${NUMBERS})([,./-](${NUMBERS}))?`
const UNIT_RE = 'tsp|teaspoons|teaspoon|tbsp|tb|tablespoons|tablespoon|cups|cup|c|lb|pounds|pound|pd|ounce|ounces|oz|gram|grams|gr|g|kgs|kg|ml|litres|liters|litre|liter|l|fl oz|quarts|quart|gallons|gallon|pints|pint|inch|in|cm|centimeter|centimitre|mm|milimitre|milimiter'
const STOPWORDS = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']
const UNWANTED_SYMBOLS = /^[^\w¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/gm
const TITLES = {
    'ing': ['ingredients'],
    'meth': ['method', 'instructions', 'steps', 'directions']
}

const PATTERN_N = `^${NUMBER_RE} ?$`                              // number alone
const PATTERN_N_U = `^${NUMBER_RE}.{0,2}(${UNIT_RE})[^a-zA-Z]*$`  // number+unit alone

const text_elements = Array.from(document.body.querySelectorAll('*')).filter(el=> { return el.innerText != undefined })

// CLASSES
class Node {
    constructor(element, score=null) {
        this.element = deepestNode(element);
        this.score = score;
        this.text = this.element.innerText;
        this.lines = correctLines(this.text);
        this.position = elementPosition(this.element).position;
        this.deepness = elementPosition(this.element).deepness;
        this.branch = getBranch([this]).branch;
        this.trunk = getBranch([this]).trunk;
        this.parent = this.element.parentNode;
        this.children = this.element.children;
        this.descendants = this.element.querySelectorAll('*')
    }
}
class Recipe {
    constructor(ingredients, method, index) {
        this.index = index;
        this.ing = ingredients;
        this.meth = method;
        this.Node = findCommonAncestor(this.ing, this.meth);
        this.Node.score = getScore(results.all, this.Node.lines);
        this.score = getScore(results.all, [...this.ing.lines, ...this.meth.lines])
    }
}

// GLOBAL VARIABLES
let dom_content_loaded = false              // DOM Content loaded
let has_results = false                     // received results from predict.js
let results = {}                            // lines identified by predict.js
let errors = {                              // false positives and negatives
    'ing': { 'mistakes': [], 'misses': [] }, 
    'meth': { 'mistakes': [], 'misses': [] } 
}   

const body_node = new Node(document.body)  
let nodes = []                              // all Node Objects
let recipes = []                            // all Recipe Objects

let display = {
    'body': document.body.innerHTML,                        // body of page, without modifications
    'focused': [body_node],                                 // current NODES in display
    'type': 'page',                                         // if it's currently displaying the original PAGE, the RECIPE or a single LIST
    'recipes': [],                                          // current RECIPES in display
    'focus': 'single',                                      // current type of Display (entire SECTION or just LISTS)
    get branch() { return getBranch(this.focused).branch }  // BRANCHES of all NODES in display
}
                                
let images = []
for (let element of document.body.querySelectorAll('IMG', 'img', 'FIGURE', 'figure', 'PICTURE', 'picture', 'SVG', 'svg')) {
    // find last ancestor Element with no Text Content
    let container = element
    while (container.parentNode.innerText == '') { container = container.parentNode }
    images.push(container) 
}

let ads = []
for (let element of document.body.querySelectorAll('*')) {
    let tags = ['IMG', 'img', 'FIGURE', 'figure', 'PICTURE', 'picture', 'SVG', 'svg']
    if (tags.includes(element.tagName)) { 
        // find last ancestor Element with no Text Content
        let container = element
        while (container.parentNode.innerText == '') { container = container.parentNode }
        images.push(container) 
    }
}
let empties = function() {
    let empty = []
    for (let element of document.body.querySelectorAll('*')) {
        if (element.innerText == '') { empty.push(element) }
    }
    return empty
}





main()


//// MAIN FUNCTIONS
function main() {
    // check for file loading complete
    loading()

    chrome.runtime.onMessage.addListener((request, sender, sendResponse)=> {
        // confirm this file is loaded (POPUP.js)
        if (request.message == 'you there?') { 
            sendResponse({ response: 'yes', length: recipes.length, title: document.title }) 
        }  
        // PROCESS RESULTS when they arrive from PREDICT.js
        if (request.message == 'results') { processResults(request.content) }       
    });
    

    // send innerText to PREDICT.js
    if (has_results == false) {
        chrome.runtime.sendMessage({ 
            message: "innerText", 
            content:  document.body.innerText, 
            url: window.location.href
        });
    }

    // set how to display page based on user's preferences
    setDisplay()

    const m3 = Date.now()

    // manage BUTTONS from POPUP
    chrome.runtime.onMessage.addListener((request, sender, sendResponse)=> {
        if (has_results == false) { return }

        console.log('MESSAGE:', request);

        if (request.parameter == 'reset') { reset() }
        if (request.parameter == 'zoom-out') { zoomOut() }
        if (request.parameter == 'zoom-in') { zoomIn() }
        if (request.parameter == 'recipes') { toggleRecipes(request.choice) }
        if (request.parameter == 'recipes.ing') { focusList(request.choice, 'ing') }
        if (request.parameter == 'recipes.meth') { focusList(request.choice, 'meth') }

        if (request.parameter == 'print') { window.print() } 

        let branch = display.branch
        if (request.parameter == 'focus') { recipeDisplay(request.choice) }
        if (request.parameter == 'images') { console.log('number of IMAGES:', images); images.forEach(img => toggleImages(img, request.choice, branch)) }
        //if (request.parameter == 'links') { recipeDisplay(request.choice) }
        if (request.parameter == 'compact') { empties().forEach(el => heightDisplay(el, request.choice)) }

        // IN-DEVELOPMENT MODE - FEEDBACK
        if (request.parameter == 'save') { saveErrors() }
        if (request.parameter == 'feedback-show') { displayFeedback() }
        if (request.parameter == 'feedback-reset') { resetFeedback() }
    });
}

function loading() {
    if (document.readyState === 'complete') {
        dom_content_loaded = true;
        console.log('LOADED!')
    }
    else { document.onreadystatechange = ()=> { loading() } }
}

function processResults(content) {
    /*
    1. Search for a match between RESULTS and page content
    2. Find an Element for each LIST (Ingredients and Method) based on a correspondence score
    3. Find is there are multiple RECIPES
    4. Store these MATCHES in global variables
    6. Send message to POPUP
    */
    const m1 = Date.now()

    if (content == undefined) { messagePopup('results undefined', true) }

    results = { 'ing': content[0], 'meth': content[1], 'all': content[2] }
    console.log(results.ing); console.log(results.meth); 

    // SEARCH FOR MATCHES
    let ing_node = findListNode(results.ing, 'ing')
    let meth_node = findListNode(results.meth, 'meth')
    let recipe_node = findListNode(results.all)
    if (ing_node == null && meth_node == null) { messagePopup('no recipe found', true) }

    console.log('FIRST MATCH:::::::::::::::::::::::::::::::'); console.log(ing_node, meth_node, (ing_node.score+meth_node.score)/2);

    // SEARCH FOR MULTIPLE RECIPES
    let ing_nodes = [[ing_node]] //getMultipleElementsForSingleList(results.ing, ing_node) //multipleLists(results.ing, ing_node)
    let meth_nodes = [[meth_node]] //getMultipleElementsForSingleList(results.meth, meth_node) //multipleLists(results.meth, meth_node)

    //console.log('SECOND MATCH:::::::::::::::::::::::::::::::');  console.log(ing_nodes[0]); console.log(meth_nodes[0])

    // SORT NODES
    nodes = [...ing_nodes[0], ...meth_nodes[0]]
    nodes = nodes.filter(node=> { return node != null });       // delete null values 
    nodes.sort((a,b)=> { return a.position - b.position })      // sort by order they appear in document
    for (let node of nodes) {                                   // delete repeated nodes
        let repeated = nodes.find(v=> { return v.element == node.element && nodes.indexOf(v) != nodes.indexOf(node)})
        if (repeated) { nodes.splice(nodes.indexOf(repeated), 1) }
    }

    //console.log('NODES:::::::::::::::::::::::::::::::::::::'); console.log(nodes);

    // STORE EACH RECIPE NODE (multiple RECIPES if all have pairs)
    if (ing_nodes[0].length == meth_nodes[0].length && ing_nodes[0].length > 1) {
        for (let i = 0; i < nodes.length; i += 2) {
            recipes.push(new Recipe(nodes[i], nodes[i+1]))
        }
    }
    else { 
        let recipe = new Recipe(ing_node, meth_node, 0)
        console.log('1ST RECIPE:', recipe);
        let new_nodes = recipeSublists(recipe.Node)
        recipes.push(new Recipe(new_nodes.ing, new_nodes.meth, 0))
        console.log('FINAL RECIPE:', recipes[0]);
    }

    

    //console.log('RECIPES:'); console.log(recipes);

    // store RESULTS - TODO if using MAIN.html
    has_results = true
    chrome.storage.local.get('recipes', async (data)=> {
        let stored_recipes = data.recipes || {}
        let url = correctURL(window.location.href)
        stored_recipes[url] = recipes

        await chrome.storage.local.set({ recipes: stored_recipes })
        //messagePopup('results :)', false, length=recipes.length)
    });

    // check if RECIPE Node score is higher than the score of the LISTS Nodes 
    // (which probabily means that it found the RECIPE but didn't find the LISTS correctly)
    let lists = recipes[0].score >= recipes[0].Node.score
    console.log(lists);
    messagePopup('results :)', false, 0, lists)

    const m2 = Date.now()
    console.log('TIMES:', (m2-start)/1000, (m1-m3)/1000, (m2-m1)/1000)
}

function findListNode(results, type=undefined) {   
    /*
    Search document and find the NODE with the highest correspondence with the RESULTS for a given LIST. 
    Avoid Elements that are not visible (no offsetHeight)
    Do not count lines which are already in Ingredients Node
    Return a Node Object or null if there is no correspondence
    */
    let best_match = [null, 0]
    
    for (let element of text_elements) {
        if (element.offsetHeight == 0) { continue } 
        let lines = correctLines(element.innerText)
        
        score = getScore(results, lines)
        
        // TODO TEST THIS
        if (type && TITLES[type].includes(lines[0])) { score *= 2 }
        
        if (score > best_match[1]) { best_match = [element, score] }
    }

    if (best_match[0] == null) { return null }

    return new Node(best_match[0], best_match[1]) 
}

function recipeSublists(ancestor) {
    /*
    Find best matches for each list within scope of RECIPE Element
    
    */
    let ing_node = findSublist('ing')
    let meth_node = findSublist('meth')

    console.log('COMPARE SCORES:', 'RECIPE:', ancestor.score, 'ING NODE:', ing_node.score, 'METH NODE:', meth_node.score)

    function findSublist(type) {
        // filter LINES in RESULTS that are not in RECIPE's innerText
        let new_results = results[type].filter(line=> { return ancestor.lines.includes(line) })

        // TODO - TEST THIS or: score/2
        if (type == 'meth') { new_results = new_results.filter(line=> { return !ing_node.lines.includes(line) }) }
        // TODO: it could be multiple node (like a <p> for each line, without common parent)

        let best_match = [null, 0]
        for (let element of ancestor.element.querySelectorAll('*')) {
            if (element.innerText == undefined || element.offsetHeight == 0) { continue }
            let lines = correctLines(element.innerText)
            let score = new_results.filter(line=> { return lines.includes(line) }).length
            
            // TODO TEST THIS
            if (TITLES[type].includes(lines[0])) { score *= 2 }
            
            if (score > best_match[1]) { best_match = [element, score] }
        }
        
        return new Node(best_match[0], getScore(new_results, correctLines(best_match[0].innerText)))
    }

    // TODO ........
    function findSublists(type) {
        let ing_results = results['ing'].filter(line=> { return ancestor.lines.includes(line) })
        let meth_results = results['meth'].filter(line=> { return ancestor.lines.includes(line) })
        // find if LIST is spread along multiple Elements - get all Elements from RECIPE Element starting from the first that 
        // contains the first LINE of RESULTS until the one who contains the last LINE.
        let first = undefined, m1, last = undefined
        let scores = []
        for (let child of ancestor.children) {
            if (child.innerText == undefined || child.innerText == '') { continue }
            if (correctLines(child.innerText).includes(results.all[0])) { first = child }
            if (correctLines(child.innerText).includes(results.all[results.all.length-1])) { last = child }
            if (first == undefined) { continue }

            // how many
            let lines = correctLines(child.innerText)
            let ing_score = results.ing.filter(line=> { return lines.includes(line) }).length
            let meth_score = results.meth.filter(line=> { return lines.includes(line) }).length
            //let ing_score = getScore(results.ing, lines)
            //let meth_score = getScore(results.meth, lines)
            scores.push([child, ing_score, meth_score])

            if (last != undefined) { break }
        }
        console.log(scores);
        // find best division
        let best_score = [null, 0]
        for (let i = 1; i < scores.length; i++) {
            let ing_score = scores.slice(0, i).reduce((total, score)=> { return total = total + score[1] }, 0)
            let meth_score = scores.slice(i).reduce((total, score)=> { return total = total + score[2] }, 0)
            if (ing_score+meth_score > best_score[1]) { best_score = [scores[i][0], ing_score+meth_score] }
            console.log(best_score);
        }

        console.log(first, last);
    }

    return {'ing': ing_node, 'meth': meth_node}
}

// TODO PROBLEM: this will try to match all of the lines
function getMultipleElementsForSingleList(results, node) { 
    /*
    Starting from first element, check Elements' innerText for list content, until list is \\\exhausted,
    saving the ones who have Matches.
    Repeat for every Element that starts with first line.
    Return the group of Matches with highest score.
    */
    let elements = [...text_elements]
    let best_match = [[node], node.score]
    for (let i = 0; i < elements.length; i++) {
        if (correctLines(elements[i].innerText).includes(results[0])) {
            let lines = [...results]
            let branches = []
            let matches = []
            
            for (let j = i; j < elements.length; j++) {
                
                // ensure no nested Nodes
                if (branches.includes(elements[j])) { continue }

                let element_lines = correctLines(elements[j].innerText)
                let temp = lines[0]
                let count = 0
                while(element_lines.includes(temp)) {
                    count++
                    temp = lines[count]
                }
                lines.slice(count)

                // Match found
                if (count > 0) { 
                    let match = new Node(elements[j])
                    matches.push(match);
                    branches.push(...match.branch)
                }
            }
            let all_lines = matches.map(m=> { return m.lines })
            let score = getScore(results, all_lines.flat())
            
            // save if higher score
            if (score > best_match[1]) { best_match = [matches, score]; 
            console.log('NEW MATHCING:::::::::::::::::::'); console.log(matches, all_lines.flat()); console.log(score) }
        }
    }
    return best_match
}
// TODO
function multipleLists(results, node) {
    /* 
    Check if the page has multiple LISTS of the same type (Ingredients or Method). 
    Search is based on the pattern "TITLE + LIST ELEMENTS".
    1st ALTERNATIVE: for every repeated Line in LIST, search for pattern 
    (where TITLE == Line and LIST ELEMENTS == every following line until next repeated line)
    2nd ALTERNATIVE: search for sections in the document with the same first line as the single match.
    Combine the score of multiple Nodes found to see if it's higher than the single match.
    If there are nested Nodes (node inside another's branch), erase the one with lowest score.
    Return an array containing an array of NODES or the original NODE, whichever has the highest score,
    and the TOTAL SCORE
    */
    let best_combo = [[node], node.score]

    // 1st ALTERNATIVE
    let repeated_lines = results.filter((line,index,arr)=> { 
        return index != arr.lastIndexOf(line) && index == arr.indexOf(line)
    });
    for (let line of repeated_lines) {
        
        // divide results in multiple lists
        let repeated_lists = []
        let temp = results.slice(results.indexOf(line))
        let next = temp.slice(1).indexOf(line)
        while (next != -1) {
            repeated_lists.push(temp.slice(0, next+1))
            temp.splice(0, next+1)
            next = temp.slice(1).indexOf(line)
        }
        repeated_lists.push(temp)

        console.log(repeated_lists);

        // check score of Nodes combined
        let nodes = []
        for (let list of repeated_lists) {
            let new_node = findListNode(list)
            nodes.push(new_node)
        }
        nodes = filterNestedNodes(nodes)

        let lines = nodes.map(v=> correctLines(v.text) ); 
        let total_score = getScore(results, lines.flat())

        // save if higher score
        if (total_score > best_combo[1]) { best_combo = [nodes, total_score] }
    }

    console.log('..............................'); 
    console.log("1st ALTERNATIVE:", best_combo[0], best_combo[1])

    // 2nd ALTERNATIVE
    let first_line = node.lines[0]
    let new_results = difference(results, node.lines)
    let repeated_nodes = [node]
    let lines = [correctLines(node.text)]
    for (let element of text_elements) {
        if (element.innerText.split('\n')[0] == first_line     // has the same 1st line
          && !element.innerText.endsWith(first_line)           // has more text
          && !node.branch.includes(element)) {                 // not in the same branch
            let new_lines = correctLines(element.innerText)
            let new_node = new Node(element, getScore(new_results, new_lines))
            repeated_nodes.push(new_node)
            lines.push(...new_lines)
            new_results = difference(new_results, new_node.lines)
        }
    }
    let total_score = getScore(results, lines)
    
    console.log('2nd ALTERNATIVE:', repeated_nodes, total_score)

    if (total_score > best_combo[1]) { 
        best_combo = [repeated_nodes, total_score] 
    }

    return best_combo
}


//// SECONDARY FUNCTIONS
function getScore(results, lines) {
    /*
    Given a set of PREDICTIONS (results) and the LINES of a document Element,
    return the proportion between MATCHES and ERRORS (false positives and negatives)
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
    
    let errors = results.length - matched + lines.length - matched

    return matched / errors
}

function findCommonAncestor(...nodes) {
    /*
    For each of the Nodes, iterate through their ancestors to find the closest one they all have in common.
    If there are Nodes in the same BRANCH, choose the highest one (with least depth).
    */
    let branch = nodes[0].branch
    let ancestor = nodes[0]
    for (let i = 1; i < nodes.length; i++) {
        let temp = nodes[i].element
        if (branch.includes(temp) && elementPosition(temp).deepness > ancestor.deepness) { continue }
        
        while (!branch.includes(temp) && temp != document.body) {
            temp = temp.parentNode
        }
        ancestor = new Node(temp)
    }
    return ancestor
}

function getBranch(nodes) { 
    /*
    Given an array of NODES, return an array of their HTML Element ancestors (TRUNK) and an array with the complete BRANCH 
    (from ancestor to descendants), both of them in descending order.
    */
    let trunks = []
    let branches = []
    for (let node of nodes) {
        let trunk = [node.element]
        let temp = node.element
        while (temp != document.documentElement) {
            trunk.unshift(temp);
            temp = temp.parentNode;
        }
        trunks.push(...trunk)
        branches.push(...trunk, ...node.element.querySelectorAll('*'))
    }                                             
    return { branch: branches, trunk: trunks }
}

function deepestNode(element) {
    /*
    Given an HTML Element, return the deepest Element (furthest away from document.documentElement) with the same innerText
    */
    if (element == null) { return }

    let deepest = element
    for (let el of text_elements) {
        if (el.innerText == element.innerText && elementPosition(el).deepness > elementPosition(deepest).deepness) {
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
        if (el == element) { break }
        position++
    }
    while (element != document.documentElement) {
        element = element.parentNode
        deepness++
    }
    return { position, deepness }
}

function filterNestedNodes(nodes) {
    /*
    Sort the nodes in descending order of score.
    Find NODES which are nested inside each other (it's Element belongs to the other's BRANCH).
    Erase the one with lowest score.
    */
    let copy = [...nodes]
    let repeated_nodes = []
    copy.sort((a,b)=> { return a.score > b.score })
    for (let i=0; i < copy.length; i++) {
        for (let j=i+1; j < copy.length; j++) {
            if (copy[i].branch.includes(copy[j].element) || copy[j].branch.includes(copy[i].element)) {
                repeated_nodes.push(copy[j])
                console.log(copy[j].element, copy[i].element)
            }
        }
    } 
    return nodes.filter(v=> { return !repeated_nodes.includes(v) })
}

function correctLines(text) {
    /*
    Divide the text in lines and delete empty lines, doubles spaces and symbols at the beggining of line
    Search for list entries which are broken in different lines (e.g: "2\nlemons", "1 cup\nwater")
    and concatenate them in a single line.
    Return an array with corrected lines
    */
    let lines = text.toLowerCase().replaceAll(/^[^\w¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/gm, '').replaceAll('\n\n', '\n').replaceAll('  ', ' ').split('\n')
    let corrected_lines = []
    for (let i = 0; i < lines.length; i++) {
        // pattern broken in 2 lines: number alone || number+unit alone
        if (lines[i].search(PATTERN_N) != -1 || lines[i].search(PATTERN_N_U) != -1) {
            // ensure a single space between concatenated lines
            let two = `${lines[i]} ${lines[i+1]}`.replaceAll('  ', ' ')
            corrected_lines.push(two)
            i++
        }
        // no pattern
        else { corrected_lines.push(lines[i]) }
    }
    return corrected_lines
}

function difference(array1, array2) {
    /* 
    Return the elements of the first array 
    that are not in the second 
    */
    let new_array = []
    for (let item of array1) {
        if (!array2.includes(item)) { new_array.push(item) }
    }
    return new_array
}

function correctURL(url) {
    return url.includes('/#') ? url.replace(/\/#.+/, '/') : url
}

function messagePopup(message, error=false, length=0, lists=true) {
    chrome.runtime.sendMessage({ message, length, lists });
    console.log(lists);
    if (error) { throw new Error(message) }
}


////// ACTIONS
function focusNode(recipes) {
    /*
    Given an array of RECIPES, get the BRANCHES of each of their LISTS BRANCH and hide all elements outside of them
    Update DISPLAY object
    */
    /*
    Given an array of RECIPES, get each of their BRANCHES and hide all elements outside of them
    Update DISPLAY object
    */
    display.type = 'recipe'

    if (display.focus == 'multi') { display.focused = recipes.map(rec=> { return [rec.ing, rec.meth] }).flat() }
    if (display.focus == 'single') { display.focused = recipes.map(rec=> { return rec.Node }).flat() }

    updateDisplay()

    // IN DEVELOPMENT MODE - 
        //show score
        let lines = []
        for (let node of display.focused) {
            lines.push(...correctLines(node.text))
        }
        console.log('SCORE:', getScore(results.all, lines))
}

function focusList(n, list) {
    display.type = list
    display.focused = [recipes[n][list]]
    updateDisplay()
}

function reset() {
    /*
    Reassign original display values
    */
    
    display.type = 'page'
    display.recipes = []
    display.focused = [body_node]
    
    updateDisplay()
}

function zoomIn() {
    /*
    Search for descendant Elements of the current Elements in display (focused Node) that are ancestors of the current 
    RECIPE selected and select the closest one that will display a differente content.
    A) If no RECIPES selected, select all of them (the radio button "Peek Recipes"/"Peek All") and recall this function
    B) If one RECIPE selected, hide all other descendants that do not belong in this RECIPE BRANCH
    C) If all RECIPES selected, do the same as in B) for each RECIPE, but hide thes ones that do not belong in 
    ANY of any of all the RECIPE BRANCHES & belongs in the corresponding RECIPE BRANCH
    Do not zoom beyond RECIPE Node Elements.
    */
    // A
    if (display.recipes.length == 0) { 
        toggleRecipes(-1, Focus=false);
        zoomIn();
    }
    // B
    else if (display.recipes.length == 1) {
        let recipe = display.recipes[0]
        let focused = display.focused[0]

        if (focused.element === recipe.Node.element) { return }

        let branch = recipe.Node.branch
        let temp = focused
        while (temp.text == focused.text && temp.element != recipe.Node.element) {
            for (let element of temp.children) {
                if (!branch.includes(element)) { element.style.display = 'none' }
                else { temp = new Node(element) }
            }
        }
        display.focused = [temp]
    }
    // C
    else {
        let branches = recipes.map(recipe=> { return recipe.Node.branch }).flat()
        let new_focused = []
        
        for (let focused of display.focused) {

            if (nodes.includes(focused.element)) { break }
            
            // find the RECIPE which has the current FOCUSED NODE in its branch
            let recipe = recipes.filter((v)=> { return v.Node.branch.includes(focused.element) })[0]

            let branch = recipe.Node.branch
            let temp = focused
            while (temp.text == focused.text && temp.element != recipe.Node.element) {
                for (let element of temp.children) {
                    if (!branches.includes(element)) { element.style.display = 'none' }
                    else if (branch.includes(element)) { temp = new Node(element) }
                }
            }
            new_focused.push(temp)
        }
        display.focused = new_focused
    }
}

function zoomOut() {
    /*
    Search for the closest ancestor Element of the current NODE in display that has a different content 
    (unless this is document.body), reassigning its original display value and that of its descendants.
    */
    if (display.focused[0] == body_node) { return }
    
    new_focused = []
    for (let focused_node of display.focused) {
        let parent_element = focused_node.parent
        while (parent_element.innerText == undefined || parent_element.innerText == focused_node.text) {
            parent_element = parent_element.parentNode

            if (parent_element == document.body || parent_element == document.body) { 
                reset();
                messagePopup('reset')
                return 
            }

            for (let element of parent_element.querySelectorAll('*')) {
                element.style.display = element.dataset.recipeekOriginalDisplay
            }
        }
        new_focused.push(new Node(parent_element))
    }
    display.focused = new_focused
}

function toggleRecipes(n, Focus=true) {
    /*
    Change what RECIPES to display. 
    n represents the index of the RECIPE to display (if == -1, show all RECIPES)
    */
    let show = n == -1 ? recipes : [recipes[n]]
    display.recipes = show
    if (Focus == true) { focusNode(show) }
}

////// OPTIONS
function setDisplay() {
    chrome.storage.sync.get('options', data=> {
        let options = data.options
        let branch = display.branch
        
        // type of RECIPE display
        options['focus'] == '1' ? display.focus = 'single' : display.focus = 'multi'

        // hide/show IMAGES, LINKS, etc.
        for (let element of document.body.querySelectorAll('*')) { 
            element.dataset.recipeekOriginalDisplay = window.getComputedStyle(element).display;
            element.dataset.recipeekOriginalHeight = window.getComputedStyle(element).height
            element.dataset.recipeekOriginalMinHeight = window.getComputedStyle(element).minHeight
            
            if (images.includes(element)) { toggleImages(element, options.images, branch) }
            else if (empties().includes(element)) { heightDisplay(element, options.compact) }
        }
    });
}

function updateDisplay() {
    chrome.storage.sync.get('options', data=> {

        console.log(data.options);
        console.log(display.branch);
        console.log('number of IMAGES:', images);

        let options = data.options
        let branch = display.branch

        for (let element of document.body.querySelectorAll('*')) {
            if (!branch.includes(element)) { 
                element.style.display = 'none' 
            }
            else if (images.includes(element)) { 
                toggleImages(element, options.images, branch)
            }
            else if (element.innerText == '') {
                heightDisplay(element, options.compact)
            }
            else { 
                element.style.display = element.dataset.recipeekOriginalDisplay 
            }
        }
    });
}
function recipeDisplay(type) {
    /*
    TODO
    */
   console.log(display.type);
    if (type == 1) { display.focus = 'single' }
    else { display.focus = 'multi' }

    if (display.type == 'recipe') { focusNode(recipes) }
    else if (display.type != 'page') { focusList(0, display.type) }
}

function heightDisplay(element, choice) {
    if (choice == 'on') { 
        element.style.height = 'fit-content'; 
        element.style.minHeight = 'fit-content'; 
    }  
    if (choice == 'off') {
        element.style.height = element.dataset.recipeekOriginalHeight
        element.style.minHeight = element.dataset.recipeekOriginalMinHeight 
    }
}

function toggleImages(image, choice, branch) {
    if (choice == 'on' || !branch.includes(image)) { image.style.display = 'none' }
    else { image.style.display = image.dataset.recipeekOriginalDisplay }
}


//// IN-DEVELOPMENT MODE FUNCTIONS - FEEDBACK
function getErrors() {
    /*
    Check for mismatches between RESULTS and the corresponding MATCH (Node) found for each type (Ingredients and Method)
    MISTAKES: false positives
    MISSED: false negatives
    */
    let lines = { 
        'ing': recipes.map((rec)=> { return correctLines(rec.ing.text) }).flat(),
        'meth': recipes.map((rec)=> { return correctLines(rec.meth.text) }).flat()
    }
    
    for (let list of ['ing', 'meth']) {
        // MISTAKES
        for (let line of results[list].flat()) {
            if (!lines[list].flat().includes(line) && line != '') {
                errors[list]['mistakes'].push(line)
            }
        }
        // MISSES
        for (let line of lines[list]) {
            if (!results[list].flat().includes(line) && line != '') {
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
        
        let lines = { 
            'ing': recipes.map(rec=> { return correctLines(rec.ing.text) }).flat().filter(line=> { return line != '' }),
            'meth': recipes.map(rec=> { return correctLines(rec.meth.text) }).flat().filter(line=> { return line != '' })
        }

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
        let copy_btn = document.createElement('button')
        copy_btn.innerText = 'COPY'
        p1.appendChild(copy_btn);
        
        let p2 = document.createElement('p')
        p2.innerText = 'Please send to - '
        let email_btn = document.createElement('button')
        email_btn.innerText = 'luisbsantos93@gmail.com'
        p2.appendChild(email_btn)

        let content = document.createElement('div')
        content.id = "recipick-feedback"
        document.body.appendChild(p1)
        document.body.appendChild(p2)
        document.body.appendChild(content)
        document.body.style.margin = '50px'

        displayFeedbackLines(content, feedback.lines, 'lines')
        displayFeedbackLines(content, feedback.mistakes, 'mistakes')
        displayFeedbackLines(content, feedback.misses, 'misses')

        copy_btn.addEventListener("click", ()=> {
            navigator.clipboard.writeText(content.innerText);
        });
        email_btn.addEventListener('click', ()=> { 
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

