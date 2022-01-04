const NUMBERS = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
const NUMBER_RE = `(${NUMBERS})([,./-](${NUMBERS}))?`
const UNIT_RE = 'tsp|teaspoons|teaspoon|tbsp|tb|tablespoons|tablespoon|cups|cup|c|lb|pounds|pound|pd|ounce|ounces|oz|gram|grams|gr|g|kgs|kg|ml|litres|liters|litre|liter|l|fl oz|quarts|quart|gallons|gallon|pints|pint|inch|in|cm|centimeter|centimitre|mm|milimitre|milimiter'
const STOPWORDS = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']
const UNWANTED = new RegExp(`^[^\w|${NUMBERS}]`, 'gm')

const PATTERN_N = `^${NUMBER_RE} ?$`                              // number alone
const PATTERN_N_U = `^${NUMBER_RE}.{0,2}(${UNIT_RE})[^a-zA-Z]*$`  // number+unit alone


// CLASSES
class Node {
    constructor(node, score=null) {
        this.node = node;
        this.score = score;
        this.text = this.node.innerText;
        this.lines = this.text.split('\n');
        this.position = nodePosition(this.node).position
        this.branch = getBranch(this.node).branch;
        this.trunk = getBranch(this.node).trunk;
        this.parent = this.node.parentNode;
        this.children = this.node.children;
    }
}
class Recipe {
    constructor(ingredients, method) {
        this.ingredients = ingredients;
        this.method = method;
        this.node = findCommonAncestor(this.ingredients, this.method)
    }
}

// GLOBAL VARIABLES
let dom_content_loaded = false              // DOM Content loaded
let has_results = false                     // received results from predict.js
let results = {}                            // lines identified by predict.js
const body_node = new Node(document.body)
let nodes = []                              // all Node Objects
let recipes = []                            // all Recipe Objects
let display = {
    'original': {},                         // original display values of each node
    'images': {},
    'focused': [body_node],                 // current NODES in display
    'recipes': []                           // current RECIPES in display
}
for (let element of document.body.querySelectorAll('*')) { 
    if (element.tagName == 'IMG') { display.images = element.style.display } 
    else { display.original[element] = element.style.display }
    
}

main()


//// MAIN FUNCTIONS
function main() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse)=> {
        // confirm this file is loaded (popup.js)
        if (request.message == 'you there?') { sendResponse({ response: 'yes', length: recipes.length }) }  
        // wait for results (predict.js)
        if (request.message == 'results') { processResults(request.content) }       
    });

    // send innerText to predict.js
    if (has_results == false) {
        chrome.runtime.sendMessage({ 
            message: "innerText", 
            content:  document.body.innerText, 
            url: window.location.href
        });
    }

    // manage BUTTONS from POPUP
    chrome.runtime.onMessage.addListener((request)=> {
        if (has_results == false) { return }

        if (request.message == 'pick') { singleFocus(recipes) }
        if (request.message == 'reset') { reset() }
        if (request.message == 'zoom-out') { zoomOut() }
        if (request.message == 'zoom-in') { zoomIn() }
        if (request.message == 'imgs-show') { toggleImages('show') }
        if (request.message == 'imgs-hide') { toggleImages('hide') }
        if (request.message == 'recipes') { toggleRecipes(request.content) }

        // IN-DEVELOPMENT
        if (request.message == 'save') { saveErrors() }
        if (request.message == 'feedback') { displayFeedback() }
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
    if (results == undefined) { messagePopup('results undefined', true) }

    results = {'ing': content[0], 'meth': content[1]}
    console.log(results.ing); console.log(results.meth)

    // SEARCH FOR MATCHES
    let ing_node = findListNode(results.ing)
    let meth_node = findListNode(results.meth)
    if (ing_node == null && meth_node == null) { messagePopup('no recipe found', true) }

    console.log('FIRST MATCH:::::::::::::::::::::::::::::::'); console.log(ing_node, meth_node)

    // SEARCH FOR MULTIPLE RECIPES
    let ing_nodes = multipleLists(results.ing, ing_node)
    let meth_nodes = multipleLists(results.meth, meth_node)

    // SORT NODES
    nodes = [...ing_nodes[0], ...meth_nodes[0]]
    nodes = nodes.filter((value)=> { return value != null });   // delete null values
    nodes.sort((a,b)=> { return a.position - b.position })      // sort by order

    console.log('NODES:::::::::::::::::::::::::::::::::::::', nodes)

    // store each RECIPE NODE
    if (ing_nodes[0].length == meth_nodes[0].length) {
        for (let i = 0; i < nodes.length; i += 2) {
            let recipe = new Recipe(nodes[i], nodes[i+1])
            recipes.push(recipe)
        }
    }
    else { 
        let recipe = new Recipe(ing_node, meth_node)
        recipes.push(recipe)
    }


    console.log('SECOND MATCH:::::::::::::::::::::::::::::::');  console.log(ing_nodes[0]); console.log(meth_nodes[0])
    console.log('RECIPES:', recipes);

    // GET MISTAKES
    /*
    analyseResults(results, recipe_node)
    let errors = {
        ing_mistakes: analyseResults(results.ing, ing_node[0])[0],
        ing_misses: analyseResults(results.ing, ing_node[0])[1],
        meth_mistakes: analyseResults(results.meth, meth_node[0])[0],
        meth_misses: analyseResults(results.meth, meth_node[0])[1],
    }
    console.log(errors)
    */
    
    has_results = true
    messagePopup('results :)', false, length=recipes.length)
    
    // send message to popup.js
    function messagePopup(message, error=false, length=0) {
        chrome.runtime.sendMessage({ message, length });
        if (error) { throw new Error(message) }
    }
}

function findListNode(results) {   
    /*
    Search document and find the NODE with the highest correspondence 
    with the RESULTS for a given LIST. 
    Return a Node object or null if there is no correspondence
    */
    let best_match = [null, 0]
    
    for (let element of document.body.querySelectorAll('*')) {
        if (element.innerText == undefined) { continue } 
        score = getScore(results, correctLines(element.innerText))
        if (score > best_match[1]) { best_match = [element, score] }
    }
    
    let match = new Node(deepestNode(best_match[0]), best_match[1]) || null

    return match
}

function multipleLists(results, node) {
    /* 
    Check if the page has multiple lists of the same type (ingredients or method). 
    Search is based on the pattern "TITLE + LIST ELEMENTS".
    1st ALTERNATIVE: for every repeated line in LIST, search for pattern 
    (where TITLE == line and LIST ELEMENTS == every line until next repeated line)
    2nd ALTERNATIVE: search for sections in the doument with the same first line as the single match.
    Combine the score of multiple nodes found to see if it's higher than the single match.
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

        // check score of nodes combined
        let nodes = []
        let lines = []
        for (let list of repeated_lists) {
            let new_node = findListNode(list)
            nodes.push(new_node)
            lines.push(...correctLines(new_node.text))
        }
        let total_score = getScore(results, lines)

        if (total_score > best_combo[1]) { best_combo = [nodes, total_score] }
    }

    console.log('..............................'); 
    console.log("1st ALTERNATIVE:", best_combo[0], best_combo[1])

    // 2nd ALTERNATIVE
    let first_line = node.lines[0]
    let new_results = difference(results, node.lines)
    let repeated_nodes = [node]
    let lines = [correctLines(node.text)]
    for (let element of document.body.querySelectorAll('*')) {
        if (element.innerText == undefined) { continue }
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

function analyseResults(results, node) {
    let node_lines = correctLines(node.innerText)
    let mistakes = [], misses = []
    // MISTAKES MADE BY PREDICTION
    for (let line of results.flat()) {
        if (!node_lines.includes(line)) {
            mistakes.push(line)
        }
    }
    // LINES MISSED BY PREDICTION
    for (let line of node_lines) {
        if (!results.flat().includes(line)) {
            misses.push(line)
        }
    }
    return [mistakes, misses]
}


//// SECONDARY FUNCTIONS
function getScore(results, lines) {
    let copy = [...results]
    let matched = 0
    for (let line of lines) {
        if (copy.includes(line)) { 
            // delete matches from list to avoid false repetetitions
            copy.splice(copy.indexOf(line), 1)
            matched++ 
        }
    }
    // number of lines not in common
    let unmatched = results.length - matched + lines.length - matched

    return matched / unmatched
}

function findCommonAncestor(...nodes) {
    if (nodes.length == 1) { return nodes }
    let branch = nodes[0].branch
    let ancestor = nodes[0]
    for (let i = 1; i < nodes.length; i++) {
        let temp = nodes[i].node
        while (!branch.includes(temp) && temp != document.body) {
            temp = temp.parentNode
        }
        ancestor = new Node(temp)
    }
    return ancestor
}

function getBranch(node) { 
    /*
    Given a node, return an array of its ancestors (TRUNK)
    and an array with the complete BRANCH (from ancestor to descendants)
    both of them in descending order
    */
    let trunk = [node]                                             
    let temp_node = node
    while (temp_node != document.documentElement) {
        trunk.unshift(temp_node);
        temp_node = temp_node.parentNode;
    }
    let branch = trunk.concat(...node.querySelectorAll('*'))  
    return { branch: branch, trunk: trunk }
}

function deepestNode(node) {
    /*
    Given a node, return the deepest node (furthest away from document.documentElement) 
    wich has the same innerText
    */
    if (node == null) { return }
    let children = Array.from(node.children)
    while (children.some(node=> { node.innerText == node.innerText })) {
        node = children.find(node=> { node.innerText == node.innerText })
        children = Array.from(node.children)
    }
    return node
}

function nodePosition(node) {
    /*
    Get the deepness (distance from document.documentElement) and 
    vertical position (distance from page top) of a given node
    */
    let position = 0
    let deepness = 0
    for (element of document.body.querySelectorAll("*")) {
        if (element == node) { break }
        position++
    }
    while (node != document.documentElement) {
        node = node.parentNode
        deepness++
    }
    return { position, deepness }
}

function correctLines(text) {
    /*
    Divide the text in lines and delete empty lines, doubles spaces and symbols at the beggining of line
    Search for list entries which are broken in different lines (e.g: "2\nlemons", "1 cup\nwater")
    and concatenate them in a single line.
    Return an array with corrected lines
    */
    let lines = text.toLowerCase().replaceAll('\n\n', '\n').replaceAll('  ', ' ').replaceAll(/^[\W]+/gm, '').split('\n')
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

function correctURL(url) {
    return url.includes('/#') ? url.replace(/\/#.+/, '/') : url
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

////// ACTIONS
function multiFocus(recipes) {
    /*
    Given an array of RECIPES, hide all elements outside of each BRANCH of INGREDIENT NODE and METHOD NODE
    */
    let branches = []
    display.focused = []
    for (let recipe of recipes) {
        branches.push(...recipe.ingredients.branch, ...recipe.method.branch)
        display.focused.push(recipe.ingredients, recipe.method)
    }
    for (let element of document.body.querySelectorAll('*')) {
        if (!branches.includes(element)) { element.style.display = 'none' }
    }
    console.log(branches, display.focused)
}

function singleFocus(recipes) {
    /*
    Given an array of RECIPES, get each of their BRANCHES and hide all elements outside of them
    Update DISPLAY object
    */
    let branches = []
    display.focused = []
    console.log(branches, recipes);
    for (let recipe of recipes) {
        branches.push(...recipe.node.branch)
        display.focused.push(recipe.node)
    }
    for (let element of document.body.querySelectorAll('*')) {
        if (!branches.includes(element)) { element.style.display = 'none' }
        else { element.style.display = display.original[element] }
    }
}

function reset() {
    /*
    Send a message to POPUP to reload the tab and uncheck radio
    */
    chrome.runtime.sendMessage({ message: "reset" });
    // uncheck radio in POPUP
    // reassign original display values 
    /* for (let element of document.body.querySelectorAll('*')) {
        if (element.tagName == 'IMG') { element.style.display = display.images[element] }
        else { element.style.display = display.original[element] }
    }
    display.focused = [body_node] */
}

function zoomIn() {
    // no RECIPE in display: do as if all of them in display
    if (display.recipes.length == 0) { 
        toggleRecipes(-1, Focus=false);
        zoomIn();
        return
    }

    console.log('ZZOM:', display.recipes, display.focused);

    // one RECIPE in display
    if (display.recipes.length == 1) {
        let recipe = display.recipes[0]
        let focused = display.focused[0]

        // do not zoom in beyond RECIPE Node
        if (focused.node === recipe.node.node) { return }

        let branch = recipe.node.branch
        let temp = focused
        i = 0
        // search for descendat with different innerText; do not focus Recipe Node children
        while (temp.text == focused.text && temp.node != recipe.node.node) {
            // hide all descendants not in branch
            for (let element of temp.children) {
                if (!branch.includes(element)) { element.style.display = 'none' }
                else { temp = new Node(element) }
            }
            i++
            if (i==10) {break}
        }
        display.focused = [temp]
    }
    // all RECIPES in display
    else {
        let branches = recipes.map(recipe=> { return recipe.node.branch }).flat()
        let new_focused = []
        
        for (let focused of display.focused) {
            // do not zoom in beyond a RECIPE Node
            if (nodes.includes(focused.node)) { break }
            
            // find the RECIPE which has the current FOCUSED NODE in its branch
            let recipe = recipes.filter((v)=> { return v.node.branch.includes(focused.node) })[0]

            let branch = recipe.node.branch
            let temp = focused

            i=0
            // search for descendat with different innerText; do not focus Recipe Node children
            while (temp.text == focused.text && temp.node != recipe.node.node) {
                // hide all descendants that are not in any BRANCH; save the one in current NODE RECIPE BRANCH
                for (let element of temp.children) {
                    if (!branches.includes(element)) { element.style.display = 'none' }
                    else if (branch.includes(element)) { temp = new Node(element) }
                }
                i++
                if (i==5) {break}
            }
            new_focused.push(temp)
        }
        display.focused = new_focused
    }
}

function zoomOut() {
    /*
    Change NODES to display by showing the parents of the current NODE in display
    */
    if (display.focused[0].node == document.body) { return }
    
    console.log(display.focused[0]);


    new_focused = []
    for (let focused_node of display.focused) {
        let parent_node = focused_node.parent
        while (parent_node.innerText == undefined 
          || parent_node.innerText == focused_node.text 
          && parent_node != document.body) {
            parent_node = parent_node.parentNode
            for (let element of parent_node.querySelectorAll('*')) {
                element.style.display = display.original[element]
            }
        }
        new_focused.push(new Node(parent_node))
    }
    display.focused = new_focused
}

function toggleRecipes(n, Focus=true) {
    /**
    Change what RECIPES to display. 
    n represents the index of the RECIPE to display or all, if equal to -1
    */
    let show = n == -1 ? recipes : [recipes[n]]
    display.recipes = show
    if (Focus == true) { singleFocus(show) }
}

function toggleImages(action) {
    console.log(action)
    for (let element of document.body.getElementsByTagName('img')) {
        if (action == 'hide') { 
            // check for img nested inside link
            if (!element.parentNode.tagName == 'A') { console.log(element); return } 
            else { element.style.display = 'none' }
        }
        else { element.style.display = display.original[element] }
    }
}

//// IN-DEVELOPMENT FUNCTIONS
// TODO
function saveErrors() {
    chrome.storage.local.get('feedback', f=> {
        let url = correctURL(window.location.href)
        let feedback = f.feedback || {'list': [], 'lines': {'ing': [], 'meth': []}, 'mistakes': {'ing': [], 'meth': []}, 'misses': {'ing': [], 'meth': []} }
        if (feedback.list.includes(url)) { return }
        chrome.storage.local.get('Results', r=> {
            let results = r.Results[url]
            let correct_ing = [...correctLines(ing_node[0].innerText)]
            let correct_meth = [...correctLines(meth_node[0].innerText)]
            
            feedback.list.push(url)
            feedback.lines.ing.push(...correct_ing)
            feedback.lines.meth.push(...correct_meth)
            feedback.mistakes.ing.push(...difference(results.ing, correct_ing))
            feedback.mistakes.meth.push(...difference(results.meth, correct_meth))
            feedback.misses.ing.push(...difference(correct_ing, results.ing))
            feedback.misses.meth.push(...difference(correct_meth, results.meth))
            
            chrome.storage.local.set({ feedback });
        });
    });
}

function displayFeedback() {
    chrome.storage.local.get('feedback', f=> {
        let feedback = f.feedback
        
        document.body.innerHTML = ''
        
        let copy_btn = document.createElement('button')
        copy_btn.id = "copy"
        copy_btn.innerText = 'COPY'
        let content = document.createElement('div')
        content.id = "recipick-feedback"
        document.body.appendChild(copy_btn)
        document.body.appendChild(content)
        document.body.style.margin = '50px'

        displayFeedbackLines(content, feedback.lines, 'lines')
        displayFeedbackLines(content, feedback.mistakes, 'mistakes')
        displayFeedbackLines(content, feedback.misses, 'misses')
        
        copy_btn.addEventListener("click", ()=> {
            navigator.clipboard.writeText(content.innerText);
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