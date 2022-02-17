const pos = require('pos');
nlp.extend(require('compromise-sentences'))

const UNITS = 'tsp|tsps|teaspoons|teaspoon|tbsp|tb|tbsps|tablespoons|tablespoon|cups|cup|c|lb|lbs|pounds|pound|pd|pds|ounce|ounces|oz|gram|grams|gr|g|kilogram|kilograms|kgs|kg|miligram|miligrams|mg|mgs|ml|mls|mililitre|mililiter|mililitres|mililiters|cl|cls|centiliter|centilitre|centiliter|centilitre|dl|dls|decilitre|deciliter|decilitres|deciliters|l|ls|litres|liters|litre|liter|fl oz|quarts|quart|qt|gallons|gallon|pints|pint|inch|inches|in|cm|cms|centimeter|centimetre|centimeters|centimetres|mm|mms|milimitre|milimiter|milimitres|milimiters|large|small|medium|bunch|handfull|pinch|sprinkle'
const NUMBERS = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
const NUMBER_TEMPLATE = `(${NUMBERS})(([ ,./-])(${NUMBERS}))?`
const NUMBER_RE = new RegExp(NUMBER_TEMPLATE, 'g')

const STOPWORDS = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']
const PUNCTUATION = /[!"#$%&\'()*+,\\\-.:;<=>?@[\]\^_`{\|}~]/g

const PATTERN_N = `^${NUMBER_TEMPLATE} ?$`                              // single line with only NUMBER
const PATTERN_N_U = `^${NUMBER_TEMPLATE}.{0,2}(${UNITS})[^a-zA-Z]*$`    // single line with only NUMBER + UNIT
const ING_PATTERNS = [
    `^${NUMBER_TEMPLATE}.?(${UNITS})[^a-zA-Z0-9]{1,2}`,      // NUMBER + UNIT + text
    `^${NUMBER_TEMPLATE} .+`                                 // NUMBER + text
]

// trained AI Models
const ING_SAVED_MODEL = 'models/saved_model/ing_lines_binary/model.json';
const METH_SAVED_MODEL = 'models/saved_model/meth_lines_binary/model.json';


// IN DEVLEOPLMENT
let m1, m2

// wait for message from PAGE.js
chrome.runtime.onMessage.addListener(request => {
    
    if (request.message !== "innerText") { return }
    
    m1 = Date.now()/1000

    chrome.storage.local.get('tokens', async (lib) => { 
        
        const ingTokens = await lib.tokens['ing']
        const methTokens = await lib.tokens['meth']

        const lines = correctLines(request.text)

        let vv = Date.now()/1000

        const vectors = vectorize(lines, ingTokens, methTokens)

        let p1 = Date.now()/1000

        const ingPrediction = await predict(vectors.ing, ING_SAVED_MODEL)
        const methPrediction = await predict(vectors.meth, METH_SAVED_MODEL)

        let p2 = Date.now()/1000

        let results = { 'ing': [], 'meth': [], 'all': [] }
        for (let i = 0; i < lines.length; i++) {    
            if (ingPrediction[i][0] < ingPrediction[i][1]) { 
                results.ing.push(lines[i]);
                results.all.push(lines[i]) 
            }
            if (methPrediction[i][0] < methPrediction[i][1] && vectors.meth[i][9] === 0) {  // avoid lines with ING PATTERN
                results.meth.push(lines[i]) 
                if (!results.ing.includes(lines[i])) { results.all.push(lines[i]) }
            }
        }
        if (results.all.length === 0) { results = undefined }

        console.log('VECTORS:', (p1-vv).toFixed(2));
        console.log('MODEL:', (p2-p1).toFixed(2));

        sendResults(results, request.url)
    }); 
});

//// FUNCTIONS
function sendResults(results, url) {
    /** Send message to PAGE.js with RESULTS */
    chrome.tabs.query({ url }, tabs => {
        if (tabs[0]) {
            m2 = Date.now()/1000; 
            chrome.tabs.sendMessage(tabs[0].id, { message: "results", results, time:m2 })
            console.log('TIMES:', m2-m1);
        }
        else {  // invalid url
            let validUrl = url.replace(/#.*/, '')
            if (validUrl === url) { throw new Error (`problem with URL: ${url}\n${tabs}`) }
            else { sendResults(results, validUrl) }
        }
    });
}

function vectorize(lines, ingTokens, methTokens) {
    /** 
     * Create a VECTOR with values for:
     * Length; if it starts with a Verb; Score; neighbor Scores (3 before + 3 after); Patterns matched 
     */
    let ingScores = [], methScores = []
    let ingVectors = [], methVectors = []

    lines.forEach(line => {
        let words = getTokens(line)
        let verb = startsWithVerb(line, words[0])

        let ingScore = getTokensScore(words, ingTokens)
        ingScores.push(ingScore)
        ingVectors.push([words.length, verb, ingScore])

        let methScore = getTokensScore(words, methTokens)
        methScores.push(methScore)
        methVectors.push([words.length, verb, methScore])
    });

    for (let i in ingVectors) {
        let pattern1 = lines[i].match(ING_PATTERNS[0]) ? 1 : 0
        let pattern2 = lines[i].match(ING_PATTERNS[1]) ? 1 : 0

        ingVectors[i].push(
            ingScores[i-3] || 0,
            ingScores[i-2] || 0,
            ingScores[i-1] || 0,
            ingScores[i+1] || 0,
            ingScores[i+2] || 0,
            ingScores[i+3] || 0,
            pattern1,
            pattern2
        )
        methVectors[i].push(
            methScores[i-3] || 0,
            methScores[i-2] || 0,
            methScores[i-1] || 0,
            methScores[i+1] || 0,
            methScores[i+2] || 0,
            methScores[i+3] || 0,
            pattern1,
            pattern2
        )
    }
    
    return { 'ing': normalize(ingVectors), 'meth': normalize(methVectors) }
}

function correctLines(text) {
    /**
     * Delete empty lines and doubles spaces from text; divide text in lines; delete symbols at the beggining of each line
     * Search for list entries which are broken in different lines (e.g: "2\nlemons", "1 cup\nwater")
     * and concatenate them in a single line.
     */
    let lines = text.toLowerCase().replaceAll(/^[^\w¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/gm, '').replaceAll('\n\n', '\n').replaceAll(/ +/g, ' ').split('\n')
    
    let correctedLines = []
    for (let i = 0, len = lines.length; i < len; i++) {
        let correctedLine = lines[i]

        if (!correctedLine.match(/\w/)) { continue }  // avoid empty lines

        if (correctedLine.match(PATTERN_N) || correctedLine.match(PATTERN_N_U)) {
            correctedLine = `${lines[i]} ${lines[i+1]}`.replaceAll('  ', ' ')  // ensure a single space between concatenated lines
            i++
        }

        correctedLines.push(correctedLine) 
    }
    return correctedLines
}

function getTokens(line) {
    /** Get every word in LINE, remove punctuation and filter stopwords, numbers and not-words */

    let words = nlp.tokenize(line).terms().json().map(o => o.text);

    let numbers = [...line.matchAll(NUMBER_RE, 'g')].map(m => m[0])

    return words.map(word => word.replaceAll(PUNCTUATION, ''))
        .filter(word => !numbers.includes(word) && !STOPWORDS.includes(word) && word.match(/[a-zA-Z]/))
}

function getTokensScore(words, tokens) {
    /** For a given LINE of text, it's Score is the sum of every TOKENS's Score divided by the number of words */
    let score = words.reduce((total, word) => total + (tokens[word] || 0), 0)

    return (score / words.length) || 0
}

function startsWithVerb(line) {
    /** 
     * Check if the first word in a LINE is a Verb (not in a past tense), which may indicate it is a METHOD List LINE.
     * Used two different POS-tagging API as they're not very accurate
     */
    let sentences = nlp(line).sentences()

    for (let sentence of sentences.json()) {
        var words = new pos.Lexer().lex(sentence.text);
        var tagger = new pos.Tagger();
        var tag = tagger.tag(words)[0][1];
        if (!sentence.verb || tag === 'VBN') { continue }
        if (sentence.text.startsWith(sentence.verb.text) || tag.startsWith('VB')) {
            return 1
        }
    }
    return 0
}

function normalize(vectors) {
    /** 
     * Get maximum value of each column of VECTOR.
     * Divide each VECTOR value by its column's maximum value, except for zeros 
     */
    
    let maxs = []
    let length = vectors[0].length
    for (let i = 0; i < length; i++) {
        maxs.push(Math.max(...vectors.map(v => v[i])))
    }
    
    for (let i in vectors) {
        vectors[i] = vectors[i].map((value, j) => 
            (maxs[j] === 0) ? value : (value / maxs[j])
        )
    }
    
    return vectors
}

async function predict(vectors, modelPath) {
    /** Execute previously trained model */
    
    let input = tf.tensor3d([...vectors.flat()], [vectors.length, vectors[0].length, 1])
    
    const model = await tf.loadGraphModel(modelPath)
    const exec = await model.executeAsync(input)

    return exec.arraySync()
}
