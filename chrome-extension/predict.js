nlp.extend(compromiseNumbers)

const UNITS = 'tsp|tsps|teaspoons|teaspoon|tbsp|tb|tbsps|tablespoons|tablespoon|cups|cup|c|lb|lbs|pounds|pound|pd|pds|ounce|ounces|oz|gram|grams|gr|g|kilogram|kilograms|kgs|kg|miligram|miligrams|mg|mgs|ml|mls|mililitre|mililiter|mililitres|mililiters|cl|cls|centiliter|centilitre|centiliter|centilitre|dl|dls|decilitre|deciliter|decilitres|deciliters|l|ls|litres|liters|litre|liter|fl oz|quarts|quart|qt|gallons|gallon|pints|pint|inch|inches|in|cm|cms|centimeter|centimetre|centimeters|centimetres|mm|mms|milimitre|milimiter|milimitres|milimiters|large|small|medium|bunch|handfull|pinch|sprinkle'
const NUMBERS = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
const NUMBER_TEMPLATE = `(${NUMBERS})([,./-](${NUMBERS}))?`
const NUMBER_RE = new RegExp(NUMBER_TEMPLATE, 'g')

const STOPWORDS = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']
const PUNCTUATION = /[!"#$%&\'()*+,\\\-.:;<=>?@[\]\^_`{\|}~]/g

const PATTERN_N = `^${NUMBER_TEMPLATE} ?$`                              // number alone
const PATTERN_N_U = `^${NUMBER_TEMPLATE}.{0,2}(${UNITS})[^a-zA-Z]*$`    // number+unit alone
const TITLE_PATTERN = '^[a-zA-Z]+\W?$'                                  // line with just 1 word
const ING_PATTERNS = [
    `^${NUMBER_TEMPLATE}.?(${UNITS})[^a-zA-Z0-9]{1,2}`,                 // number + unit + text
    `^${NUMBER_TEMPLATE} .+`                                            // number + text
]
const METH_PATTERNS = [ 
    '^[0-9]+\W{1,3}\w+'                                                 // ordered list numeration
]

const ING_SAVED_MODEL = 'models/saved_model/ing_lines_binary/model.json';
const METH_SAVED_MODEL = 'models/saved_model/meth_lines_binary/model.json';


// IN DEVLEOPLMENT
let m1, m2

// wait for message from PAGE.js
chrome.runtime.onMessage.addListener( async (request)=> {
    if (request.message == "innerText") {
        m1 = Date.now()/1000

        chrome.storage.local.get('tokens', async (lib) => { 
            
            const ing_tokens = await lib.tokens['ing']
            const meth_tokens = await lib.tokens['meth']

            // LINES
            let text = request.content
            let lines = correctLines(text)

            // VECTORS
            let ing_vectors = vectorize(lines, ing_tokens)
            let meth_vectors = vectorize(lines, meth_tokens)
            
            // PREDICTIONS
            let ing_prediction = await predict(ing_vectors, ING_SAVED_MODEL)
            let meth_prediction = await predict(meth_vectors, METH_SAVED_MODEL)
            let ing_results = [], meth_results = [], all_results = []
            for (let i = 0; i < lines.length; i++) {    // save lines with positive predictions
                if (ing_prediction[i][0] < ing_prediction[i][1]) { 
                    ing_results.push(lines[i]) 
                    all_results.push(lines[i])
                }
                if (meth_prediction[i][0] < meth_prediction[i][1]) { 
                    meth_results.push(lines[i]) 
                    if (!all_results.includes(lines[i])) { all_results.push(lines[i]) }
                }
            }
            let results = all_results.length > 0
                ? [ing_results, meth_results, all_results] 
                : undefined
           
            // SAVE RESULTS & CALL CONTENT SCRIPT
            sendResults(results, request.url)
        }); 
    }
});


//// SECONDARY FUNCTIONS
function sendResults(results, url) {
    /** Send message to PAGE.js with results after checking for a valid URL */

    chrome.tabs.query({ url }, async (tabs) => {
        if (tabs[0] == undefined) {    // invalid URL
            if (url.includes('/#')) { 
                let valid_url = correctURL(url)
                chrome.tabs.query({ url: valid_url }, async (tabs2) => {
                    m2 = Date.now()/1000; await chrome.tabs.sendMessage(tabs2[0].id, { message: "results", content: results, time:m2 })
                    console.log('TIMES:', m2-m1);
                });
            }
            else { chrome.runtime.sendMessage(tabId, { message: "problem with URL"}) }
        }
        else { 
            m2 = Date.now()/1000; chrome.tabs.sendMessage(tabs[0].id, { message: "results", content: results, time:m2 }) 
            console.log('TIMES:', m2-m1);
        }
    });
}

function correctURL(url) {
    /** Delete hashmarks */
    return url.includes('/#') 
        ? url.replace(/\/#.*/, '/') 
        : url
}

function correctLines(text) {
    /** Divide the text in lines and delete empty lines, doubles spaces and symbols at the beggining of line
    Search for list entries which are broken in different lines (e.g: "2\nlemons", "1 cup\nwater")
    and concatenate them in a single line.
    Return an array with corrected lines */
    
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

//// MACHINE LEARNING FUNCTIONS
function vectorize(lines, tokens) {
    /* 
    Create a vector for each sentence
    [length, score, neighbor_scores(3 before + 3 after), [patterns]] 
    */
    let words = lines.map(line=> getTokens(line))
    let scores = words.map(ww=> getTokensScore(ww, tokens))

    let vectors = []
    let padded_scores = [0, 0, 0, ...scores, 0, 0, 0]
    for (let i in lines) {
        i = parseInt(i)
        vectors.push([
            words[i].length,
            scores[i],
            padded_scores[i],
            padded_scores[i+1],
            padded_scores[i+2],
            padded_scores[i+4],
            padded_scores[i+5],
            padded_scores[i+6],
            ...getPatterns(lines[i])
        ])
    }
    return normalize(vectors)
}

function getPatterns(line) {
    return [
        line.match(TITLE_PATTERN) ? 1 : 0,
        line.match(ING_PATTERNS[0]) ? 1 : 0,
        line.match(ING_PATTERNS[1]) ? 1 : 0,
        line.match(METH_PATTERNS[0]) && !line.match(ING_PATTERNS[0]) ? 1 : 0,
    ]
}

function getTokens(line) {
    /*
    Get every word in line, remove punctuation and filter stopwords and numbers
    */
    let words = nlp.tokenize(line).terms().json().map(o=> o.text);
    let numbers = [...line.matchAll(NUMBER_RE, 'g')].map(m=> m[0])
    
    words.forEach((word, i, array)=> { array[i] = word.replaceAll(PUNCTUATION, '') })
    
    return words.filter((w) => { return !numbers.includes(w) && !STOPWORDS.includes(w)})
}

function getTokensScore(words, tokens) {
    /*
    Get the score for a line that is the sum of every token's score divided by the number of words
    */
    if (words.length == 0) { return 0 }
    let score = 0
    for (let word of words) {
        if (Object.keys(tokens).includes(word)) {
            score += tokens[word]
        }
    }
    return score / words.length
}

function normalize(vectors) {
    /*
    Get maximum value of each column
    Divide values by maximum value, except for binary values
    */
    let maxs = Array(vectors[0].length)
    for (let i = 0; i < vectors[0].length; i++) {
        maxs[i] = Math.max(...vectors.map(v=> v[i]))
    }
    for (let vector of vectors) {
        for (let i = 0; i < vector.length; i++) {
            if (maxs[i] == 1 || maxs[i] == 0) { continue }
            vector[i] = vector[i] / maxs[i]
        }
    }
    return vectors
}

async function predict(vectors, model_path) {
    /*
    Execute previously trained model 
    */
    let input = tf.tensor3d([...vectors.flat()], [vectors.length, vectors[0].length, 1])
    
    const model = await tf.loadGraphModel(model_path)
    const exec = await model.executeAsync(input)
    
    return exec.arraySync()
}
