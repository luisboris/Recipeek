var units = [
    "tsp", "teaspoons", "teaspoon", "tbsp", "tb", "tablespoons", "tablespoon", "cups", "cup", "c",
    "lb", "pounds", "pound", "pd", "ounces", "oz", "grams", "gr", "g", "kgs", "kg",
    "ml", "litres", "liters", "litre", "liter", "l", "fl oz", "quarts", "quart", "gallons", "gallon", "pints", "pint",
    "inch", "in", "cm", "centimeter", "centimitre", "mm", "milimitre", "milimiter",
]

chrome.storage.local.get("Database", (db) => {
    const text = document.body.innerText;
    const title_ingredients = db.Database.title_ingredients;
    const url = window.location.href;
    
    // INGREDIENT MATCHES
    var ingredient_matches = [];
    title_ingredients.unshift(["ingredients"])
    // check if URL already in INGREDIENTS TITLE list
    for (entry of title_ingredients) {
        //if (entry.includes(url.match(/http.+?\/{2}(.+?)\//)[1])) { title_ingredients.unshift(entry); break }
    }
    // check with evey title until match
    for (let i = 0; i < title_ingredients.length && ingredient_matches.flat(1).length == 0; i++) {
        let ing_title = title_ingredients[i][0]
        let ingredients_regex = [
            new RegExp(`(^${ing_title}[^\\n]+?\\n[^¨]+?)*?(^ingredient[^\\n]+?\\n[^¨]+?)+(?:^instructions|^method|^directions|^preparation|^procedure|^how to)`, 'gmi'),
            new RegExp(`(^${ing_title}[^\\n]+?\\n[^¨]+?)*?(^ingredient[^\\n]+?\\n[^¨]+?)(?:^1[^\\w\\n\\u00BD\\u2153\\u00BC\\u2155\\u2159\\u2150\\u215B\\u2154\\u2156\\u00BE\\u2157\\u215C][^\\w\\n\\u00BD\\u2153\\u00BC\\u2155\\u2159\\u2150\\u215B\\u2154\\u2156\\u00BE\\u2157\\u215C])`, 'gmi'),
            new RegExp(`(^${ing_title}[^\\n]+?\\n[^¨]+?)*(^ingredient[^\\n]+?\\n[^¨]+)`, 'gmi'),
            //new RegExp(`(^${ing_title}[^\\n]*?\\n[^¨]+?)*?(^ingredient[^\\n]*?\\n[^¨]+?)(?:\\n\\n)`, 'gmi'),
        ]
        for (let j = 0; j < ingredients_regex.length; j++) { 
            ingredient_matches.push([...text.matchAll(ingredients_regex[j])]); 
        }
    }

    // METHOD MATCHES
    var method_matches = [];
    const method_regex = [
        /(?=((^instructions)([^¨]+)))/gmi,
        /(?=((^directions)([^¨]+)))/gmi,
        /(?=((^procedure)([^¨]+)))/gmi,
        /(?=((^method)([^¨]+)))/gmi,
        /(?=((^preparation)([^¨]+)))/gmi,
        /(?=((^steps|^step by step)([^¨]+)))/gmi,
        /(?=((^how to)([^¨]+)))/gmi,
        /(^1[^0-9\n]{2}[^\n]+?\n\n?(^[0-9][^0-9\n]{2}[^\n]+?\n\n?)+)/gmi,
        /(^recipe[^\w\n]*?\n[^¨]+)/gmi,
    ]
    for (let j = 0; j < method_regex.length; j++) { 
        method_matches.push([...text.matchAll(method_regex[j])]); 
    }

    console.log("%cING MATCHES:", 'color: #ef00a8', ingredient_matches)
    console.log("%cMETH MATCHES:", 'color: #ef00a8', method_matches)

    // MATCH PARSING
    var valid = false;
    var recipe = [];
    var i_index = 0, m_index = 0, repetition = 0;
    while (valid == false) {

        // skip empty matches
        while (ingredient_matches[i_index].length == 0 && i_index < ingredient_matches.length-2) { i_index++ }
        while (method_matches[m_index].length == 0 && m_index < method_matches.length-2) { m_index++ }

        console.log(`---------------- ROUND: I - ${i_index}/${ingredient_matches.length} | M - ${m_index}/${method_matches.length} -------------------`)

        recipe = [
            ...getMatchesArray(ingredient_matches[i_index], "ingredients-"), 
            ...getMatchesArray(method_matches[m_index], "method-")
        ].sort((a, b) => { return a.index - b.index })

        // check nested sections, set title, split them line by line
        // and delete lines without numbers/letters/symbols
        processMatches1(recipe, m_index);

        // check matches against Database
        processAgainstDatabase(recipe, db.Database, i_index);

        let validation = validateMatches(recipe, db.Database);
        recipe = recipe.filter(section => { return !validation.no.includes(section.title) });
        if (!validation.yes.includes("i")) { i_index++ }
        if (!validation.yes.includes("m")) { m_index++ }
        if (validation.yes.match(/mi|im/)) { valid = true }

        if (i_index == ingredient_matches.length) { i_index-- }
        if (m_index == method_matches.length) { m_index-- }
        (repetition == m_index+i_index) ? valid = true : repetition = m_index + i_index
        
        console.log("%cRECIPE IN WHILE\n", 'color: #f09a0b', recipe)
        console.log(`yes: ${validation.yes}, no: ${validation.no}`)
        console.log(repetition, valid)
    }

    if (recipe.length == 0) {
        chrome.runtime.sendMessage({ message: "no matches" });
        window.alert("The machine says it's very sorry but it couldn't find any recipe in this page. \n\nThere's a possibility this machine is a bit shortsighted, or just insubordinate. So, if you're sure there's a recipe somewhere in this page, please let us know so we can teach it some good manners! \n\nThank you!");
    }
    else {
        chrome.storage.local.get("Library", (data) => {
            console.log("%cRECIPES v.1:\n", 'background: #222; color: #0ada55', recipe)

            let Library = data.Library || [];
            Library.push({
                url: url, 
                host: window.location.host,
                text: text, 
                title: getTitle(document.title),   
                recipe: editRecipe(recipe)          
            });
            chrome.storage.local.set({ Library })
            console.log("%cRECIPES v.2:\n", 'background: #222; color: #0ada55', Library[Library.length-1].recipe)
            
            // message Background to render Main
            chrome.runtime.sendMessage({ message: "your dinner is ready" });
        
            chrome.storage.local.set({ stringsToSend: {
                ingredients: prepareListsToSend(recipe, text).ing_list, 
                not_ingredients: prepareListsToSend(recipe, text).ing_not, 
                method: prepareListsToSend(recipe, text).meth_list, 
                not_method: prepareListsToSend(recipe, text).meth_not, 
                text: text 
            }});
        });
    }
});



////  MATCH-PARSING FUNCTIONS  ////
function getMatchesArray(matches, name) {
    let new_matches = [...matches];
    new_matches.forEach((match,i,array)=>{
        array[i] = { 
            title: name, 
            list: name == "ingredients-" ? match[2] : match[1], 
            index: match.index 
        }
        //console.log(array[i])
    });
    return new_matches
}

function processMatches1(recipe, m_index) {
    for (let j = 0; j < recipe.length; j++) {
        if (j < recipe.length - 1) {
            // check Nested Sections
            let nextsection_sliced = recipe[j+1].list.slice(0, recipe[j+1].list.length * 0.5)
            if (recipe[j].list.includes(nextsection_sliced)) {
                console.log("SECTION NESTED-------------", nextsection_sliced);
                recipe[j].list = recipe[j].list.split(nextsection_sliced)[0]
            }
        }
        recipe[j].title = recipe[j].title+j;
        // split line by line
        recipe[j].list = recipe[j].list.replaceAll(/\n\n/g, "\n").split("\n");
        // formatting problem: when values are separated from rest of line 
        recipe[j].list.forEach((line, i, list) => { 
            for (var unit of units) {
                let onlynumber_re = new RegExp(/^[0-9,.\/\⁄\∕ \u00BD\u2153\u00BC\u2155\u2159\u2150\u215B\u2154\u2156\u00BE\u2157\u215C]+$/)
                let numberandunit_re = new RegExp(`^[0-9,.\\/\\⁄\\∕ \\u00BD\\u2153\\u00BC\\u2155\\u2159\\u2150\\u215B\\u2154\\u2156\\u00BE\\u2157\\u215C]+${unit}[\\W]*$`, 'i') 
                if (line.match(onlynumber_re) || line.match(numberandunit_re)) { 
                    list[i] = `${line} ${list[i+1]}`;
                    list[i+1] = "";
                    console.log("sepatared:", line, unit)
                    break; 
                }
            }
        });
        // filter empty lines or lines without alphabetical chars
        recipe[j].list = recipe[j].list.filter(entry => { 
            return entry.length > 0 && entry.match(/[a-zA-Z]/)
        });
        if (m_index == 7 && recipe[j].title.startsWith("method")) { 
            recipe[j].list = validateOrderedList(recipe[j].list);
        }
        console.log([...recipe[j].list])
    }
}

function processAgainstDatabase(recipe, Database, i_index) {
    for (match of recipe) { 
        //console.log([...match.list], match.title)
        // METHOD
        if (match.title.startsWith("method") || i_index == 2 || recipe.length == 1) {  // TODO PROBLEM!
            for (var j = 0; j < match.list.length; j++) {
                if (match.list[j].length == 0) { continue }
                let count = 0;
                let line = match.list[j].replaceAll(/[^\w ]/g, "").replaceAll(/ +/g, " ").trim().toLowerCase();
                let line_length = line.trim().split(" ").length;
                // delete evey line after "first not method"
                for (pair of Database.not_method_first) {
                    if (Database.method.includes(pair)) { continue }
                    // keywords (e.g. "cuisine:", "tags:", etc.)
                    if (pair.endsWith(":") && match.list[j].toLowerCase().startsWith(pair)) {
                        match.list = match.list.slice(0, j)
                        j = match.list.length;
                        console.log("%cMETH KEYWORD _\n", 'color: #87ab6b', + line + "\nPair _" + pair, count)
                        break;
                    }
                    if (line.match(`\\b${pair}\\b`)) { 
                        count++
                        // if line starst with pair(not single word), check
                        // if line is only 1 to 3 words long, check only one pair
                        // else, search for at least 1/3 of the line
                        if (line_length == 1 ||
                            line_length <= 3 && pair.match(/\w \w/) ||
                            count > parseFloat(line_length)/3) {
                                match.list = match.list.slice(0, j)
                                j = match.list.length;
                                console.log('%cMETHOD FIRST MATCH _\n', 'color: #87ab6b', line + "\nPair _" + pair, count)
                                break;
                        }
                    }
                }
                // search line by line and delete the unvalid ones
                for (pair of Database.not_method) {
                    if (Database.method.includes(pair)) { continue }
                    if (line.toLowerCase().match(`\\b${pair}\\b`)) {
                        count++;
                        if (count > 0 && line_length == 1 ||
                            count > 0 && line_length == 2 && pair.match(/\w \w/) ||
                            count > line_length*0.5) {
                                console.log("%cMETHOD MATCH _\n", 'color: #87ab6b', line, "\nPAIR _" + pair, count)
                                match.list.splice(j, 1);
                                j--;
                                break;
                        }
                    }
                }
            }
        }
        // INGREDIENTS
        if (match.title.startsWith("ingredient")) {
            for (let j = 0; j < match.list.length; j++) {
                let count = 0;
                let line = match.list[j].replaceAll(/[^\w ]/g, "").replaceAll(/ +/g, " ").trim().toLowerCase();
                let line_length = line.trim().split(" ").length;
                // search line by line and delete the unvalid ones
                for (pair of Database.not_ingredients) {
                    if (Database.ingredients.includes(pair)) { continue }
                    if (line.toLowerCase().match(`\\b${pair}\\b`)) {  // || line.toLowerCase() == "ingredients" && j > 0
                        count++;
                        if (count > 0 && line_length == 1 ||
                            count > 0 && line_length == 2 && pair.match(/\w \w/) ||
                            count > line_length*0.5) {
                                console.log("%cING MATCH _\n", 'color: #17ab6b', line, "\nPAIR _" + pair, count)
                                match.list.splice(j, 1);
                                j--;
                                break;
                        }
                    }
                }
            }
        }
        //console.log([...match.list])
    }
}

function validateMatches(recipe, Database) {
    let no = [], yes = "";
    for (let i = 0; i < recipe.length; i++) {
        let match = recipe[i];
        console.log([...match.list])
        if (match.list.length < 2) { no.push(match.title); continue }
        if (match.title.startsWith("ingredients")) {
            // METHOD section before INGREDIENT section (not valid)
            if (i > 0 && !yes.includes("i") && recipe[i+1] != undefined && recipe[i-1].title.startsWith("method")) { 
                console.log("BEFORE", recipe[i-1])
                yes = yes.replace("m", "");
                no.push(recipe[i-1].title);
            }
            if (validateThroughStatistics(match.list, Database, "ingredients")) { yes += "i" }
        }
        if (match.title.startsWith("method")) { 
            if (validateThroughStatistics(match.list, Database, "method")) { yes += "m" }
        }
    }
    return { yes, no }
}

function validateOrderedList(list) {
    // if list nor ordered
    for (i in list) { if (!list[i].startsWith(i+1)) { return list = [] }}
    list.unshift("METHOD");
    return list
}

function validateThroughStatistics(list, Database, section) {
    avg_chars = list.reduce((total, value, i) => {
        if (i == 0) { return total }
        return total = (total * (i-1) + value.length) / i
    }, 0);
    avg_words = list.reduce((total, value, i) => {
        if (i == 0) { return total }
        let word_count = value.trim().split(/[ \t]/g).length;
        return total = (total * (i-1) + word_count) / i
    }, 0);
    
    if (section == "ingredients") {
        // (avg > maxAvg) || (avg*2 > avg; no line starts with number)????
        if (avg_words > Database.stats.ingredients_maxavg_words ||
            avg_words * 2 > Database.stats.ingredients_avg_words && !list.join().match(/^[0-9]/gm)) 
            console.log("%cAVG ING WORDS, CURRENT:", "color:#FF550b", avg_words.toFixed(2))
            console.log("AVG", Database.stats.ingredients_avg_words.toFixed(2))
            console.log("MAX", Database.stats.ingredients_maxavg_words.toFixed(2))
            console.log("MIN", Database.stats.ingredients_minavg_words.toFixed(2))
            { return true }
    }
    if (section == "method") {
        //console.log("%cAVG METHOD WORDS, DB:", "color:#FF550b", Database.stats.method_avg_words.toFixed(2))
        //console.log("CURRENT:", avg_words.toFixed(2))
        //console.log("MAX:", Database.stats.method_maxavg_words.toFixed(2))
        //console.log("MIN", Database.stats.method_minavg_words.toFixed(2))
        //if (avg_words > Database.stats.method_maxavg_words) { return false }
    }   
    
    return true
}

////  LINE-PARSING FUNCTIONS  ////
function getTitle(title) {
    let divisions = [ "-", "|", "—", "\u2010", "\u2011", "\u2012", "\u2013", "\u2014", "\u2015" ]
    for (div of divisions) {
        if (title.includes(` ${div} `)) { title = title.split(` ${div} `)[0] }
    }
    return title
}

function editRecipe(recipe) {
    recipe.forEach((section, i, recipe) => {
        delete recipe[i].index;
        recipe[i].list = section.list.filter(entry => { return entry.length > 0 && entry.match(/\w/) && entry != undefined });
        recipe[i].list.forEach((entry, i, list) => {
            if (section.title.startsWith("ingredients") /*&& !notListElement(entry)*/) {
                try {           
                    var items = getItems(entry);
                    if (items == "separated") { list[i+1] = `${entry.trim()} ${list[i+1]}` }
                    else { list[i] = { line: items.line, elements: items.elements, elements: items.elements, to_scale: items.to_scale }}
                }
                catch(error) { console.log(entry); console.error(error) }
            }
            else { list[i] = { line: entry }}
        });
    });
    return recipe
}

function notListElement(line) {
    if (line.endsWith(":") && line.length < 60 || 
        line.toLowerCase().startsWith("for the") ||
        line.startsWith("(") && line.endsWith(")") ||
        line.match(/[a-zA-Z]/) && line.toUpperCase() === line) {
        return true;
    }
    return false;
}

function getItems(line) {
    let non_units = ["inch", "in", "cm", "centimeter", "centimitre", "mm", "milimitre", "milimiter"]
    let numbers = {
        words: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "a dozen", "half a", "half"],
        digits: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
        fractions: ["1/4", "1/2", "3/4", "1/3", "2/3", "1/6", "1/8"],
        symbols: ["\u00BD", "\u2153", "\u00BC", "\u2155", "\u2159", "\u2150", "\u215B", "\u2154", "\u2156", "\u00BE", "\u2157", "\u215C"], // fraction symbols
    }
    let divs = [" to ", " or ", "-", "\u2010", "\u2011", "\u2012", "\u2013", "\u2014", "\u2015"] // various types of dashes

    // convert word-numbers to digits
    for (var word of numbers.words) {     
        let wordmatch = line.match(`\\b${word}\\b`);
        if (wordmatch) { line = line.replaceAll(wordmatch, ` ${converter(word, "word").print} `) }
    }

    // convert symbols to digit fractions
    for (var symbol of numbers.symbols) {                               
        if (line.includes(symbol)) { line = line.replaceAll(symbol, " " + converter(symbol, "symbol").print) }
    }

    // sub strange slash for normal one 
    line = line.replaceAll(/[\⁄\∕]+/g, "/");

    // make all decimals with "."
    line = line.replaceAll(/([0-9])(,)([0-9])/g, "$1.$3")

    // delete unwanted symbols in beggining of line nd double spaces
    line = line.replaceAll(/^\W+/g, "").replaceAll(/\s{2}/g, " ");
    
    // delete punctuation used in markings, sub "+" to avoid regex errors
    line = line.replaceAll(/[\^\`\´\|_]/g, "").replaceAll(/ ?\+ ?/g, " plus ");

    let positions = line.toLowerCase().concat(";;;");       
    let items = [];        
    let elements = [];

    // DIVS
    for (var div of divs) { 
        var re = new RegExp(`([0-9][^a-zA-Z]?${div}[^a-zA-Z]?[0-9])`, 'gi')
        let div_matches = [...positions.matchAll(re)] || [];
        for (var match of div_matches) {
            var mark = match[0].replace(div, "^".repeat(div.length));
            positions = positions.replace(match[0], mark);
            var index = match.index + match[0].indexOf(div);
            var name = line.substr(index, div.length);
            items.push({ name, type: "div", index });
        }
    }

    // NUMBERS
    let number_matches = [...positions.matchAll(/[0-9]+([^a-z\^][0-9]+)*/gi)] || [];
    let delay = 0; // when line length changes due to editing
    number_matches.forEach((match, i, array) => {
        let number = match[0];
        if (number == "") { return }
        array[i] = { name: number, float: null, type: "", index: match.index + delay };
        // "x" div (can be like "3 x 1l jugs of milk" or "3 (1l) jugs of milk") - 2nd number is not for values
        if (positions.match(`${number} ?[x(] ?[0-9]`)) { array[i+1] = [""] }
        if (parseInt(number) === 0 || positions.match(`${number}%`)) { }   
        else if (number.match(/^[0-9\.]+$/)) {                                        // Number only
            array[i].type = "n-number", 
            array[i].float = converter(number, "number").int
        }           
        else if (number.match("/")) {    
            let fraction = number.match(/[0-9]+\/[0-9]+/)[0]
            if (number.match(`^${fraction}\\W[0-9]+`)) {                              // Fraction + Number (only fraction counts)
                array[i].type = "n-fraction-z";
                array[i].name = fraction;
                array[i].float = converter(array[i].name, "fraction").int
            }
            if (number == fraction) {                                                 // Fraction
                array[i].type = "n-fraction"; 
                array[i].name = fraction; 
                array[i].float = converter(array[i].name, "fraction").int
            }      
            else if (number.match(`([0-9]+)\\W(${fraction})`)) {                      // Number + Fraction
                array[i].type = "n-number+fraction";
                array[i].float = converter(array[i].name, "number+fraction").int
                array[i].name = array[i].float.toString()
                // change number in line
                line = line.replace(number, array[i].name)
                positions = positions.replace(number, array[i].name)
                delay += array[i].name.length - number.length
            }
        }
        if (array[i].type != "") { 
            items.push(array[i]); 
            elements.push({ name: array[i].name, type: "number", index: array[i].index, value: array[i].float}) 
        } 
    });
    let to_scale = items.filter(item => { return item.type != "div" });
    delete to_scale.type;

    // UNITS AND NON-UNITS
    for (var unit of units) {                       
        let re = new RegExp(`[0-9]+[^a-zA-Z\^]?(${unit})\\W`, 'gi')
        let unit_matches =  [...positions.matchAll(re)] || [];
        for (match of unit_matches) {
            // find "x" div (replace characters so regex doesn't fuck up)
            if (positions.match(`[0-9] ?[x(][^a-z]*${match[0].replace(/\W|_/g, "[$&]")}`)) { console.log(match[0].replace(/\W|_/g, "[$&]")); continue }         // "x" DIV
            var index = match.index + match[0].indexOf(unit);  
            var name = line.substr(index, unit.length) 
            items.push({ name, type: "unit", index });
            elements.push({ name, type: "unit", index });
        }
    }
    for (non_unit of non_units) {
        let re = new RegExp(`[0-9][^a-zA-Z\^]*(${non_unit})\\W`, 'gi')
        let non_unit_matches =  [...positions.matchAll(re)] || [];
        for (match of non_unit_matches) {
            var index = match.index + match[0].indexOf(non_unit);  
            var name = line.substr(index, non_unit.length) 
            items.push({ name, type: "x-unit", index });
        }
    }

    // remove "plus" from LINE
    line = line.replaceAll(/ plus /g, " + ")

    items.sort((a, b) => { return a.index - b.index });
    elements.sort((a, b) => { return a.index - b.index });
    // add TEXT elements:
    let elements_length = elements.length;
    elements.forEach((element, i, array)=>{
        let text_index;
        i == 0 ? text_index = 0 : text_index = array[i-1].index + array[i-1].name.length
        let line_before = line.slice(text_index, element.index).trim();
        if (line_before != "") { elements.push({ name: line_before, type: "text", index: text_index }) }
        // last element:
        if (i == elements_length-1) {  
            let last_index = element.index + element.name.length
            let line_after = line.slice(last_index).trim();
            if (line_after != "") { elements.push({ name: line_after, type: "text", index: last_index }) }
        }
    })
    elements.sort((a, b) => { return a.index - b.index });
    if (items.length > 0) { items.push({type: "n-final"}) }     // mark ending of list

    //console.log(elements)

    // group ELEMENTS
    let groups = [];
    groups.forEach((entry, i, groups) => {
        if (entry.type == "unit") { return }
        let group = { name: entry.name, type: entry.type, index: entry.index, number: undefined, unit: undefined }
        // TEXT
        if (entry.type == "text") { 
            groups.push(group)
            return 
        }
        // NUMBER
        group.number = group.name 
        // NUMBER + UNIT
        if (i < groups.length-1 && groups[i+1].type == "unit") { 
            group.unit = groups[i+1].name; 
            group.name += " "+group.unit;
            group.type += "-unit"
        }
        groups.push(group)
    })

    return { line, groups, elements, to_scale: to_scale }
}

function converter(number, type) {
    let words = ["","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve"];
    let others = ["half a", "half", "", "", "", "", "", "", "", "", "", ""];
    let fractions = [
        "", "",         "",        "",      "",       "",       "",       "",       "", "", 
        "", "",      "1/2",     "1/3",   "1/4",    "1/5",    "1/6",    "1/7",    "1/8", "",
        "", "",         "",     "2/3",      "",    "2/5",       "",       "",       "", "",
        "", "",         "",        "",   "3/4",    "3/5",       "",       "",    "3/8", "",
    ];
    let symbols = [
        "", "",         "",       "",       "",       "",       "",       "",       "", "", 
        "", "",   "\u00BD", "\u2153", "\u00BC", "\u2155", "\u2159", "\u2150", "\u215B", "", 
        "", "",         "", "\u2154",       "", "\u2156",       "",       "",       "", "", 
        "", "",         "",       "", "\u00BE", "\u2157",       "",       "", "\u215C", "", 
    ];

    // FUTURE user INPUT as only means to some ambiguities 
    // (e.g.: if you want to double the following: 5 1/2 lemons; 5 1/2 litre bottles of...
    // that would give different values in each example: 11 lemons; 10 1/2 litre bottles of...)
    // if that appears, and if the user wants to convert, 
    // use a new function with a popup asking help from the user to determine what the case is
    
    let int_value = null;
    let print_value = null;
    
    switch (type) {
        case undefined:                                         
            print_value = number;
            break;
        
        case "word": 
            if (number.includes("dozen")) { int_value = print_value = 12 }                              
            else if (others.includes(number)) {
                int_value = 0.5;
                print_value = "1/2";
            }
            else { int_value = print_value = words.indexOf(number) }
            break;

        case "fraction":
            var fraction = number.split("/");
            int_value = fraction[0]/fraction[1];
            var index = fractions.findIndex(f => { return f == number });
            index >= 0 ? print_value = symbols[index] : print_value = number;
            break;

        case "symbol":
            var index = symbols.findIndex(s => { return s == number });
            if (index >= 0) { 
                var fraction = fractions[index].split("/");
                int_value = fraction[1]/fraction[0];
                print_value = fractions[index]
            }
            break;

        case "number+fraction":
            let n = number.match(/([0-9]+)\W(([0-9]+)\/([0-9]+))/);
            print_value = int_value = parseInt(n[1]) + n[3]/n[4]
            //print_value = n[1] + n[2];
            break;

        default: 
            int_value = print_value = number;
    }
    return {int: parseFloat(int_value), print: print_value }
}

function toPrint(group) {    // uniformize display of UNITS and DIVS
    let units_words = [
        [ "cup", "cups" ],
        [ "tbsp", "tbsp", "tb", "tablespoons", "tablespoon" ],
        [ "tsp", "tsp", "teaspoons", "teaspoon" ],
        [ "quart", "quarts" ],
        [ "gallon", "gallons" ], 
        [ "pint", "pints" ],
    ]
    let units_symbols = [
        [ "l", "l", "liter", "litres", "liters" ],
        [ "ml", "ml" ],
        [ "fl oz" ],
        [ "g", "g", "gr", "grams" ],
        [ "kg", "kg", "kgs" ],
        [ "lb", "lb", "pounds", "pound", "pd" ],
        [ "oz", "oz", "ounces" ],
    ]
    let divs = ["\u2012", "\u2011", "-", "\u2010", "\u2013", "\u2014", "\u2015" ];
    
    if (group.elements.length == 1 && group.elements > 1) { pl = 1 }
    else { pl = 0 }

    item = item.toLowerCase();

    for (entry of units_words) {
        if (entry.includes(item)) {
            return " "+entry[pl];
        }
    }
    for (entry of units_symbols) {
        if (entry.includes(item)) {
            return entry[pl];
        }
    }
    if (divs.includes(item)) {
        return divs[0];
    }
    else {
        return item;
    }
}

function prepareListsToSend(recipe, text) {
    let ing_list = [], meth_list = [];
    let ing_not = text, meth_not = text;
    for (section of recipe) {
        if (section.title.startsWith("ingredients")) { 
            for (entry of section.list) { 
                ing_not = ing_not.replace(entry, "");
                ing_list.push(entry);
            }
        }
        if (section.title.startsWith("method")) { 
            for (entry of section.list) { 
                meth_not = meth_not.replace(entry, "");
                meth_list.push(entry);
            }
        }
    }
    ing_not = ing_not.replaceAll(/ingredients?/g, "").replaceAll(/  /g, " ").replaceAll(/\n\n/g, "\n").split("\n")
    meth_not = meth_not.replaceAll(/method|instructions|directions|preparation|how to/g, "").replaceAll(/  /g, " ").replaceAll(/\n\n/g, "\n").split("\n")
    return { ing_list, ing_not, meth_list, meth_not }
}
