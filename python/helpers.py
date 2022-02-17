import nltk
import re
import numpy as np
import spacy


unit_list = [
    'tsp', 'tsps', 'teaspoons', 'teaspoon', 'tbsp', 'tb', 'tbsps', 'tablespoons', 'tablespoon', 
    'cups', 'cup', 'c',
    'lb', 'lbs', 'pounds', 'pound', 'pd', 'pds', 'ounce', 'ounces', 'oz', 
    'gram', 'grams', 'gr', 'g', 'kilogram', 'kilograms', 'kgs', 'kg', 'miligram', 'miligrams', 'mg', 'mgs',
    'ml', 'mls', 'mililitre', 'mililiter', 'mililitres', 'mililiters', 
    'cl', 'cls', 'centiliter', 'centilitre', 'centiliter', 'centilitre',
    'dl', 'dls', 'decilitre', 'deciliter', 'decilitres', 'deciliters',
    'l', 'ls', 'litres', 'liters', 'litre', 'liter',
    'fl oz', 'quarts', 'quart', 'qt', 'gallons', 'gallon', 'pints', 'pint',
    'inch', 'inches', 'in', 
    'cm', 'cms', 'centimeter', 'centimetre', 'centimeters', 'centimetres', 
    'mm', 'mms', 'milimitre', 'milimiter', 'milimitres', 'milimiters',
    'large', 'small', 'medium', 'bunch', 'handfull', 'pinch', 'sprinkle'
]

unit_regex = 'tsp|tsps|teaspoons|teaspoon|tbsp|tb|tbsps|tablespoons|tablespoon|cups|cup|c|lb|lbs|pounds|pound|pd|pds|ounce|ounces|oz|gram|grams|gr|g|kilogram|kilograms|kgs|kg|miligram|miligrams|mg|mgs|ml|mls|mililitre|mililiter|mililitres|mililiters|cl|cls|centiliter|centilitre|centiliter|centilitre|dl|dls|decilitre|deciliter|decilitres|deciliters|l|ls|litres|liters|litre|liter|fl oz|quarts|quart|qt|gallons|gallon|pints|pint|inch|inches|in|cm|cms|centimeter|centimetre|centimeters|centimetres|mm|mms|milimitre|milimiter|milimitres|milimiters|large|small|medium|bunch|handfull|pinch|sprinkle'

number_list = []
n_re = '[0-9]+|[\u00BC-\u00BE\u2150-\u215E]|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a dozen|twenty'
n_regex = f'({n_re})([ ,./-]({n_re}))?'

ing_patterns = [
    f'^{n_regex}.?({unit_regex}) .+',
    f'^{n_regex} .+'
]
meth_patterns = [
    '^[0-9]+\W{1,3}\w+'
]
title_pattern = '^[a-zA-Z]+\W?$'

nlp = spacy.load('en_core_web_sm')



def get_score(words, tokens):
    score = 0
    # score = score in tokens    
    for word in words:
        if word in tokens:
            score += tokens[word]
    # no tokens, no score
    return score / len(words) if len(words) > 0 else 0

def get_tokens(sentence):
    """
    Process strings by converting all words to lowercase, and removing 
    all that have characters other than letters or numbers
    """
    words = nltk.tokenize.word_tokenize(sentence.lower())
    stopwords = nltk.corpus.stopwords.words("english")
    numbers = get_numbers(sentence)

    return list(
        word for word in words 
        if re.search('[^a-zA-Z]', word) is None and word not in numbers and word not in stopwords
    )

def get_numbers(sentence):
    """
    Find all numbers in different possible formats (decimals, fractions, symbols, etc.)
    """
    return list(
        number[0] for number in re.findall(n_regex, sentence)
    )

def startswithverb(sentence):
    for sent in nlp(sentence).sents:
        doc = list(nlp(sent.text))
        if doc and doc[0].pos_ == 'VERB':
            return 1
    return 0

def vectorize(sentences, tokens):    
    words = list(get_tokens(sentence) for sentence in sentences)
    verbs = list(startswithverb(sentence) for sentence in sentences)
    scores = list(get_score(sentence_words, tokens) for sentence_words in words)

    # create vector for each sentence
    # [length; 1st word is a verb; score; neighbor_scores(3 before + 3 after); patterns]
    padded_scores = [0, 0, 0] + scores + [0, 0, 0]
    vectors = []
    for i in range(len(sentences)):
        # TODO check for unwanted symbols or spaces in beggining of line
        # TODO check consistey with JS patterns
        vectors.append(
            [len(words[i]),
            verbs[i],
            scores[i],
            padded_scores[i],
            padded_scores[i+1],
            padded_scores[i+2],
            padded_scores[i+4],
            padded_scores[i+5],
            padded_scores[i+6],
            1 if re.search(ing_patterns[0], sentences[i]) else 0,
            1 if re.search(ing_patterns[1], sentences[i]) else 0]
        )
    for w, v in zip(sentences, vectors):
        #print(w, v[1])
        pass

    return vectors

def normalize(xx):
    # for each column get the maximum value
    array = np.array(xx)
    maxs = []
    for i in range(len(xx[0])):
        maxs.append(max(array[..., i]))
    # divide each float value by the column's maximum value
    for row in xx:
        for i in range(len(row)):
            #TODO test this // normalize neighbor values???
            row[i] = float(row[i] / maxs[i]) if maxs[i] not in [0, 1] else row[i]

