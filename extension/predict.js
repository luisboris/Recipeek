const pos = require('pos');
nlp.extend(require('compromise-sentences'))

const UNITS = 'tsp|tsps|teaspoons|teaspoon|tbsp|tb|tbsps|tablespoons|tablespoon|cups|cup|c|lb|lbs|pounds|pound|pd|pds|ounce|ounces|oz|gram|grams|gr|g|kilogram|kilograms|kgs|kg|miligram|miligrams|mg|mgs|ml|mls|mililitre|mililiter|mililitres|mililiters|cl|cls|centiliter|centilitre|centiliter|centilitre|dl|dls|decilitre|deciliter|decilitres|deciliters|l|ls|litres|liters|litre|liter|fl oz|quarts|quart|qt|gallons|gallon|pints|pint|inch|inches|in|cm|cms|centimeter|centimetre|centimeters|centimetres|mm|mms|milimitre|milimiter|milimitres|milimiters|large|small|medium|bunch|handfull|pinch|sprinkle'
const NUMBERS = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
const NUMBER_TEMPLATE = `(${NUMBERS})(([ ,./-])(${NUMBERS}))?`
const STOPWORDS = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']
const PUNCTUATION = /[!"#$%&\'()*+,\\\-.:;<=>?@[\]\^_`{\|}~]/g

/** single line with only NUMBER */
const PATTERN_N = `^${NUMBER_TEMPLATE} ?$`                            
/** single line with only NUMBER + UNIT */
const PATTERN_N_U = `^${NUMBER_TEMPLATE}.{0,2}(${UNITS})[^a-zA-Z]*$`    
/** Patterns of Ingredient List Lines:  
 * [0]: NUMBER + UNIT + text   
 * [1]: NUMBER + text */
const ING_PATTERNS = [
    `^${NUMBER_TEMPLATE}.?(${UNITS})[^a-zA-Z0-9]{1,2}`,      
    `^${NUMBER_TEMPLATE} .+`                                 
]

// trained AI Models
const model_n = 3
const ING_MODEL = `models/saved_model_${model_n}/ing_lines_binary/model.json`;
const METH_MODEL = `models/saved_model_${model_n}/meth_lines_binary/model.json`;

// IN DEVLEOPLMENT
let choice = 0  //'Smoothed VerbStart', 'not-Smoothed VerbStart',


main()


function main() {
    chrome.runtime.onMessage.addListener(request => {  // wait for message from PAGE.js
        if (request.message !== "innerText") { return }                              
        
        chrome.storage.local.get('tokens', async (lib) => { 
            const ingTokens = await lib.tokens['ing']
            const methTokens = await lib.tokens['meth']

            const lines = correctLines(request.text);                               
            
            const vectors = vectorize2(lines, ingTokens, methTokens);               

            const ingPrediction = await predict(vectors.ing, ING_MODEL)
            const methPrediction = await predict(vectors.meth, METH_MODEL);         

            let results = { ing: [], meth: [], all: [], repeated: [], repScores: [] }
            for (let i = 0; i < lines.length; i++) {   
                if (ingPrediction[i][1] > ingPrediction[i][0]) { 
                    results.ing.push(lines[i]);
                    results.all.push(lines[i])
                }
                if (methPrediction[i][1] > methPrediction[i][0]) { 
                    results.meth.push(lines[i])
                    if (results.all.includes(lines[i])) { 
                        results.repeated.push(lines[i]) 
                        results.repScores.push([ingPrediction[i][1], methPrediction[i][1]])
                    } else { 
                        results.all.push(lines[i]) 
                    }
                }
            }
            if (results.all.length === 0) { results = undefined }

            sendResults(results, request.url);                           
        }); 
    });
}

/** Create a VECTOR for each line with values for:  
 * - length (number of tokens);   
 * - if it has a sentence that starts with a verb, adverb or preposition/subordinating conjunction (methClass);  
 * - score (based on tokens relevance and density);  
 * - neighbor Scores (3 before + 3 after);  
 * - patterns matched */
function vectorize2(lines, ingTokens, methTokens) {
    let ingVectors = [], methVectors = []
    let ingScores = [], methScores = []
    let maxs = { 'length': 0, 'methClass': 0, 'ingScore': 0, 'methScore': 0 }
    
    for (let i = 0, len = lines.length; i < len; i++) {
        let line = lines[i]
        let lineTokens = getTokens(line)

        let length = lineTokens.length
        if (length > maxs.length) { maxs.length = length }

        let methClass = hasMethClasses(line)
        if (methClass > maxs.methClass) { maxs.methClass = methClass }

        let ingScore = getScore(lineTokens, ingTokens)
        if (ingScore > maxs.ingScore) { maxs.ingScore = ingScore }
        ingScores.push(ingScore)

        let methScore = getScore(lineTokens, methTokens)
        if (methScore > maxs.methScore) { maxs.methScore = methScore }
        methScores.push(methScore)

        let ingVector = [], methVector = []

        ingVector[0] = methVector[0] = length
        ingVector[1] = methVector[1] = methClass
        ingVector[2] = methVector[2] = line.match(ING_PATTERNS[0]) ? 1 : 0
        ingVector[3] = methVector[3] = line.match(ING_PATTERNS[1]) ? 1 : 0
    
        ingVector[4] = ingScore
        ingVector[5] = (i >= 3) ? ingScores[i-3] : 0
        ingVector[6] = (i >= 2) ? ingScores[i-2] : 0
        ingVector[7] = (i >= 1) ? ingScores[i-1] : 0
    
        methVector[4] = methScore
        methVector[5] = (i >= 3) ? methScores[i-3] : 0
        methVector[6] = (i >= 2) ? methScores[i-2] : 0
        methVector[7] = (i >= 1) ? methScores[i-1] : 0
        
        if (i >= len-1) { 
            ingVector[8] = methVector[8] = 0 
        }
        if (i >= len-2) { 
            ingVector[9] = methVector[9] = 0 
        }
        if (i >= len-3) { 
            ingVector[10] = methVector[10] = 0 
        }
        
        if (i >= 1) { 
            ingVectors[i-1][8] = ingScore
            methVectors[i-1][8] = methScore
        }
        if (i >= 2) { 
            ingVectors[i-2][9] = ingScore
            methVectors[i-2][9] = methScore
        }
        if (i >= 3) { 
            ingVectors[i-3][10] = ingScore
            methVectors[i-3][10] = methScore
        }

        ingVectors.push(ingVector)
        methVectors.push(methVector)
    }

    if (choice < 2) {  // Smooth
        ingScores = smoothScores(lines, ingScores)
        methScores = smoothScores(lines, methScores)

        for (let i in lines) {
            i = parseInt(i)
            ingVectors[i][4] = ingScores.scores[i]
            ingVectors[i][5] = ingScores.scores[i-3] || 0
            ingVectors[i][6] = ingScores.scores[i-2] || 0
            ingVectors[i][7] = ingScores.scores[i-1] || 0
            ingVectors[i][8] = ingScores.scores[i+1] || 0
            ingVectors[i][9] = ingScores.scores[i+2] || 0
            ingVectors[i][10] = ingScores.scores[i+3] || 0
            methVectors[i][4] = methScores.scores[i]
            methVectors[i][5] = methScores.scores[i-3] || 0
            methVectors[i][6] = methScores.scores[i-2] || 0
            methVectors[i][7] = methScores.scores[i-1] || 0
            methVectors[i][8] = methScores.scores[i+1] || 0
            methVectors[i][9] = methScores.scores[i+2] || 0
            methVectors[i][10] = methScores.scores[i+3] || 0
        }
        maxs.ingScore = ingScores.max
        maxs.methScore = methScores.max
    }

    normalize(ingVectors, methVectors, maxs)

    return { ing: ingVectors, meth: methVectors }
}

/** Create a VECTOR for each line with values for:  
 * - length (number of tokens);   
 * - if it has a sentence that starts with a verb, adverb or preposition/subordinating conjunction (methClass);  
 * - score (based on tokens relevance and density);  
 * - neighbor Scores (3 before + 3 after);  
 * - patterns matched */
function vectorize(lines, ingTokens, methTokens) {
    let lengths = [], methClass = [], patterns = []
    let ingScores = [], methScores = []
    
    for (let i = 0, len = lines.length; i < len; i++) {
        let line = lines[i]
        let lineTokens = getTokens(line)
        
        lengths.push(lineTokens.length)
        methClass.push(hasMethClasses(line))
        patterns.push([
            line.match(ING_PATTERNS[0]) ? 1 : 0, 
            line.match(ING_PATTERNS[1]) ? 1 : 0
        ])
        ingScores.push(getScore(lineTokens, ingTokens))
        methScores.push(getScore(lineTokens, methTokens))
    }

    if (choice < 2) { 
        ingScores = smoothScores(lines, ingScores).scores
        methScores = smoothScores(lines, methScores).scores
    }

    let ingVectors = [], methVectors = []
    for (let i = 0, len = lines.length; i < len; i++) {
        let equal = [
            lengths[i],
            methClass[i],
            patterns[i][0],
            patterns[i][1],
        ]
        ingVectors.push([
            ...equal,
            ingScores[i],
            ingScores[i-3] || 0,
            ingScores[i-2] || 0,
            ingScores[i-1] || 0,
            ingScores[i+1] || 0,
            ingScores[i+2] || 0,
            ingScores[i+3] || 0,
        ])
        methVectors.push([
            ...equal,
            methScores[i],
            methScores[i-3] || 0,
            methScores[i-2] || 0,
            methScores[i-1] || 0,
            methScores[i+1] || 0,
            methScores[i+2] || 0,
            methScores[i+3] || 0,
        ])
    }

    let maxs = { 
        'length': Math.max(...lengths), 
        'ingScore': Math.max(...ingScores), 
        'methScore': Math.max(...methScores) 
    }

    normalize(ingVectors, methVectors, maxs)

    return { ing: ingVectors, meth: methVectors }
}

/** Delete empty lines and doubles spaces from text; divide text in lines; delete symbols at the beggining of each line  
 * Search for list entries which are broken in different lines (e.g: "2\nlemons", "1 cup\nwater") and concatenate them in a single line. */
function correctLines(text) {
    let lines = text.toLowerCase().replaceAll(/^[^\w¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/gm, '').replaceAll('\n\n', '\n').replaceAll(/ +/g, ' ').split('\n')
    
    let correctedLines = []
    for (let i = 0, len = lines.length; i < len; i++) {
        if (!lines[i].match(/\w/)) { continue }  // avoid empty lines

        if (lines[i].match(PATTERN_N) || lines[i].match(PATTERN_N_U)) {
            lines[i] = `${lines[i]} ${lines[i+1]}`.replaceAll('  ', ' ')  // ensure a single space between concatenated lines
            i++
        }
        correctedLines.push(lines[i]) 
    }
    return correctedLines
}

/** Get every word in LINE, remove punctuation and filter stopwords, numbers and not-words */
function getTokens(line) {
    let tokens = nlp.tokenize(line).terms().json().map(o => o.text);

    tokens = tokens
    .map(word => word.replaceAll(PUNCTUATION, ''))
    .filter(word => !word.match(/[0-9]|[\u00BC-\u00BE\u2150-\u215E]/) && !STOPWORDS.includes(word) && word.match(/[a-zA-Z]/))

    return tokens
}

/** For a given LINE of text, its Score is the sum of every TOKENS's Score divided by the number of tokens  
 * If a LINE has no TOKENS, its SCORE is 0 */
function getScore(lineTokens, tokensScore) {
    let tokenScore = lineTokens.reduce((total, token) => total + (tokensScore[token] || 0), 0)

    return (tokenScore / lineTokens.length) || 0
}

/** Smooth scores which are too high compared to the rest, to avoid big differences  
 * Sort the scores in ascending order, then smooth the ones that are farther away from the previous highest score than the latter is from the average:  
 * e.g.: average = 100, score1 = 150, score2 = 160, score3 = 230  ->  smooth score3 but not score2 */
function smoothScores(lines, scores) {
    let entries = lines
    .map((line, i) => new Object({ line, score: scores[i] }))
    .sort((a, b) => a.score - b.score)

    let filteredScores = scores.filter(score => score >= 10)
    if (filteredScores.length == 0) { return scores }

    let averageScore = filteredScores.reduce((total, score) => total + score) / filteredScores.length
    
    let pairs = {}
    for (let i in entries) {
        if (i > 0) {
            let score1 = entries[i-1].score
            let score2 = entries[i].score
            if (score1 >= 10 && score1 > averageScore) {
                let difference1 = score1 - averageScore
                let difference2 = score2 - score1
                if (difference2 > difference1) { 
                    entries[i].score = score2 - difference2 * 0.85
                }
            }
        }
        pairs[entries[i].line] = entries[i].score
    }
    let max = entries[entries.length-1].score
    let smoothedScores = lines.map(line => pairs[line])

    return { scores: smoothedScores, max }
}

/** Check the first word of every sentece of a Line: if it's a Verb (not in a past tense), Adverb or Preposition/Subordinating Conjunction, that may indicate it is a METHOD List LINE.  
 * Used two different POS-tagging API as they're not very accurate */
function hasMethClasses(line) {
    let sentences = nlp(line).sentences().json()
    for (let sentence of sentences) {
        var words = new pos.Lexer().lex(sentence.text);
        var tagger = new pos.Tagger();
        var tag = tagger.tag(words)[0][1];
        if (sentence.verb && sentence.text.startsWith(sentence.verb.text) || tag.match(/^IN|VB|VBP|VBZ|VBG|RB|RBR|RBS|WRB$/)) {
            return 1
        }
    }
    return 0
}

/** Get maximum value of each column of VECTOR.  
 * Divide each VECTOR value by its column's maximum value, except for zeros  */
function normalize(ingVectors, methVectors, maxs) {
    let maxL = maxs.length, maxI = maxs.ingScore, maxM = maxs.methScore

    ingMaxs = [maxL, 1, 1, 1, maxI, maxI, maxI, maxI, maxI, maxI, maxI]
    methMaxs = [maxL, 1, 1, 1, maxM, maxM, maxM, maxM, maxM, maxM, maxM]

    for (let i = 0, len = ingVectors.length; i < len; i++) {
        for(let j = 0, len2 = ingVectors[0].length; j < len2; j++) {
            ingVectors[i][j] = ingVectors[i][j] / ingMaxs[j]
            methVectors[i][j] = methVectors[i][j] / methMaxs[j]
        }
    }
}

/** Execute previously trained model */
async function predict(vectors, modelPath) {
    let input = tf.tensor3d([...vectors.flat()], [vectors.length, vectors[0].length, 1])
    
    const model = await tf.loadGraphModel(modelPath)
    const exec = await model.executeAsync(input)

    return exec.arraySync()
}

/** Send message to PAGE.js with RESULTS */
function sendResults(results, url) {
    chrome.tabs.query({ url }, tabs => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { message: "results", results, time:m2 })
        }
        else {  // invalid url
            let validUrl = url.replace(/#.*/, '')
            if (validUrl === url) { throw new Error (`problem with URL: ${url}\n${tabs}`) }
            else { sendResults(results, validUrl) }
        }
    });
}