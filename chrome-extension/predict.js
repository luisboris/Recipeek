nlp.extend(compromiseNumbers)

const UNITS = 'tsp|tsps|teaspoons|teaspoon|tbsp|tb|tbsps|tablespoons|tablespoon|cups|cup|c|lb|lbs|pounds|pound|pd|pds|ounce|ounces|oz|gram|grams|gr|g|kilogram|kilograms|kgs|kg|miligram|miligrams|mg|mgs|ml|mls|mililitre|mililiter|mililitres|mililiters|cl|cls|centiliter|centilitre|centiliter|centilitre|dl|dls|decilitre|deciliter|decilitres|deciliters|l|ls|litres|liters|litre|liter|fl oz|quarts|quart|qt|gallons|gallon|pints|pint|inch|inches|in|cm|cms|centimeter|centimetre|centimeters|centimetres|mm|mms|milimitre|milimiter|milimitres|milimiters|large|small|medium|bunch|handfull|pinch|sprinkle'
const NUMBERS = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
const NUMBER_TEMPLATE = `(${NUMBERS})([,./-](${NUMBERS}))?`
const NUMBER_RE = new RegExp(NUMBER_TEMPLATE, 'g')

const STOPWORDS = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']
const PUNCTUATION = /[!"#$%&\'()*+,\\\-.:;<=>?@[\]\^_`{\|}~]/g

const PATTERN_N = `^${NUMBER_TEMPLATE} ?$`                            // number alone
const PATTERN_N_U = `^${NUMBER_TEMPLATE}.{0,2}(${UNITS})[^a-zA-Z]*$`  // number+unit alone
const TITLE_PATTERN = '^[a-zA-Z]+\W?$'
const ING_PATTERNS = [
    `^${NUMBER_TEMPLATE}.?(${UNITS})[^a-zA-Z0-9]{1,2}`, 
    `^${NUMBER_TEMPLATE} .+`
]
const METH_PATTERNS = [ 
    '^[0-9]+\W{1,3}\w+'
]

const ING_SAVED_MODEL = 'models/saved_model/ing_lines_binary/model.json';
const METH_SAVED_MODEL = 'models/saved_model/meth_lines_binary/model.json';


chrome.runtime.onMessage.addListener( async (request)=> {
    if (request.message == "innerText") {
        chrome.storage.local.get('tokens', async (lib) => { 
            
            const ing_tokens = await lib.tokens['ing']
            const meth_tokens = await lib.tokens['meth']

            // LINES
            let text = request.content
            let lines = getLines(text)[1]

            // VECTORS
            let ing_vectors = vectorize(lines, ing_tokens)
            let meth_vectors = vectorize(lines, meth_tokens)
            for (let i in lines) {
              //  console.log(lines[i]); console.log(ing_vectors[i]); console.log(meth_vectors[i])
            }
            
            // PREDICTIONS
            let ing_prediction = await predict(ing_vectors, ING_SAVED_MODEL)
            let meth_prediction = await predict(meth_vectors, METH_SAVED_MODEL)
            let ing_results = [], meth_results = []
            for (let i = 0; i < lines.length; i++) {
                if (ing_prediction[i][0] < ing_prediction[i][1]) { 
                    ing_results.push(lines[i]); //console.log(lines[i], ing_vectors[i]);  
                }
                if (meth_prediction[i][0] < meth_prediction[i][1]) { 
                    meth_results.push(lines[i]); //console.log(lines[i], meth_vectors[i]) 
                }
            }
            let results = [ing_results, meth_results]
            
            // SAVE RESULTS & CALL CONTENT SCRIPT
            chrome.tabs.query({ url: request.url }, async (tabs) => {
                if (tabs[0] == undefined) {    // invalid URL
                    if (request.url.includes('/#')) { 
                        let valid_url = correctURL(request.url)
                        chrome.tabs.query({ url: valid_url }, async (tabs2) => {
                            sendResults(valid_url, results, tabs2[0].id)
                        });
                    }
                    else { console.log('url error');//chrome.runtime.sendMessage(tabId, { message: "problem with URL"}) 
                    }
                }
                else { sendResults(request.url, results, tabs[0].id) }
            });
        }); 
    }
});


//// FUNCTIONS
function sendResults(url, results, tabId) {
    chrome.tabs.sendMessage(tabId, { message: "results", content: results })
}

function correctURL(url) {
    return url.includes('/#') ? url.replace(/\/#.+/, '/') : url
}

//// TEXT PARSING FUNCTIONS
function getLines(text) {
    let original_lines = text.split('\n')
    let corrected_lines = correctLines(text)
    return [original_lines, corrected_lines]
}

function correctLines(text) {
    let lines = text.toLowerCase().replaceAll('\n\n', '\n').replaceAll('  ', ' ').replaceAll(/^[\W]+/gm, '').split('\n')
    let corrected_lines = []
    for (let i = 0; i < lines.length; i++) {
        // pattern broken in 2 lines: number alone || number+unit alone
        if (lines[i].search(PATTERN_N) != -1 || lines[i].search(PATTERN_N_U) != -1) {
            // ensure space between concatenated lines
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
    /* create a vector for each sentence
    [length, score, neighbor_scores(3 before + 3 after), [patterns]] */
    let words = lines.map(line=> getTokens(line))
    let scores = words.map(ww=> getScore(ww, tokens))

    for (let i in lines) {
       // console.log(scores[i], lines[i], words[i])
    }

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
    let words = nlp.tokenize(line).terms().json().map(o=> o.text);
    let numbers = [...line.matchAll(NUMBER_RE, 'g')].map(m=> m[0])
    
    // remove punctuation
    words.forEach((word, i, array)=> { array[i] = word.replaceAll(PUNCTUATION, '') })
    
    // filter stopwords and numbers
    let tokens = words.filter((w) => { return !numbers.includes(w) && !STOPWORDS.includes(w)})
    
    return tokens
}

function getScore(words, tokens) {
    if (words.length == 0) { return 0 }
    let score = 0
    for (let word of words) {
        if (Object.keys(tokens).includes(word)) {
            score += tokens[word]
        }
    }
    //console.log(score, words)
    return score / words.length
}

function normalize(vectors) {
    // get maximum value of each column
    let maxs = Array(vectors[0].length)
    for (let i = 0; i < vectors[0].length; i++) {
        maxs[i] = Math.max(...vectors.map(v=> v[i]))
    }
    // divide float values by maximum value, except for first value(length)
    for (let vector of vectors) {
        for (let i = 0; i < vector.length; i++) {
            if (maxs[i] == 1 || maxs[i] == 0) { continue }
            vector[i] = vector[i] / maxs[i]
        }
    }
    return vectors
}

async function predict(vectors, model) {
    let input = getTensor(vectors)
    const model1 = await tf.loadGraphModel(model)
    const exec = await model1.executeAsync(input)
    return exec.arraySync()
};

function getTensor(vectors) {
    var array = [...vectors.flat()]
    var tensor = tf.tensor3d(array, [vectors.length, vectors[0].length, 1])
    return tensor
}
