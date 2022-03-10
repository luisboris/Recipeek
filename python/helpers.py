import nltk
import re
import numpy as np
import spacy
import os


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
    f'^{n_regex}.?({unit_regex})[^a-zA-Z]? .+',
    f'^{n_regex}.+'
]
meth_patterns = [
    '^[0-9]+\W{1,3}\w+'
]
title_pattern = '^[a-zA-Z]+\W?$'

nlp = spacy.load('en_core_web_sm')


def next_index(folder):
    # find next index number in folder
    n = None
    i = 0
    for file in folder:
        fileNum = re.search('([0-9]+).txt', file)
        if fileNum:
            n = fileNum[1]
            if int(n) > i:
                break
            i += 1
    return str(i).zfill(len(n))

def get_score(words, tokens):
    score = 0
    # score = score in tokens    
    for word in words:
        if word in tokens:
            score += tokens[word]
    # no tokens, no score
    return score / len(words) if len(words) > 0 else 0

def get_tokens(line):
    """
    Process strings by converting all words to lowercase, and removing 
    all that have characters other than letters or numbers
    """
    tokens = nlp(line)
    words = list()
    for token in tokens:
        if token.pos_ in ['ADJ', 'ADV', 'INT', 'NOUN', 'PROPN', 'VERB']:
            words.append(str(token).lower())
    return words

def get_numbers(line):
    """
    Find all numbers in different possible formats (decimals, fractions, symbols, etc.)
    """
    return list(
        number[0] for number in re.findall(n_regex, line)
    )

def vectorize(lines, tokens):    
    words, verbs, scores = list(), list(), list()
    for line in lines:
        line_words = get_tokens(line)
        words.append(line_words)
        verbs.append(has_meth_classes(line))
        scores.append(get_score(line_words, tokens))
    
    scores = smoothScore(lines, scores)

    # create vector for each line
    # [length; 1st word is a verb; patterns; score; neighbor_scores(3 before + 3 after)]
    padded_scores = [0, 0, 0] + scores + [0, 0, 0]
    vectors = []
    for i in range(len(lines)):
        # TODO check for unwanted symbols or spaces in beggining of line
        # TODO check consistey with JS patterns
        vectors.append([
            len(words[i]),
            verbs[i],
            1 if re.search(ing_patterns[0], lines[i]) else 0,
            1 if re.search(ing_patterns[1], lines[i]) else 0,
            scores[i],
            padded_scores[i],
            padded_scores[i+1],
            padded_scores[i+2],
            padded_scores[i+4],
            padded_scores[i+5],
            padded_scores[i+6],
        ])
    return vectors

def verb_density(line, words):
    if not words:
        return 0
    verb_count = 0
    for token in nlp(line):
        if token.tag_ in ['IN', 'VB', 'VBP', 'VBZ', 'VBG', 'RB', 'RBR', 'RBS', 'WRB']:
            verb_count += 1
    return verb_count / len(words)

def has_meth_classes(line):
    for sent in nlp(line).sents:
        doc = list(nlp(sent.text))
        if doc and doc[0].tag_ in ['IN', 'VB', 'VBP', 'VBZ', 'VBG', 'RB', 'RBR', 'RBS', 'WRB']:
            return 1
    return 0

def normalize(xx):
    # for each column get the maximum value
    maxs = [0] * len(xx[0])
    for x in xx:
        for i in range(len(x)):
            maxs[i] = max(float(x[i]), float(maxs[i]))
    # divide each float value by the column's maximum value
    for row in xx:
        for i in range(len(row)):
            if maxs[i] not in [0,1]:
                row[i] = float(row[i] / maxs[i]) 

def smoothScore(lines, scores):
    entries = list(sorted(zip(lines, scores), key=lambda item: float(item[1])))

    filtered = scores.copy()
    filtered = list(filter(lambda x: x>=10, filtered))
    if len(filtered) == 0:
        return scores
    
    average = sum(filtered) / len(filtered)
    
    new_entries = list()
    for i in range(len(entries)):
        if i > 0 and entries[i][1] >= 10 and entries[i-1][1] > average:
            difference1 = new_entries[i-1][1] - average
            difference2 = entries[i][1] - new_entries[i-1][1]
            if difference2 > difference1:
                score = entries[i][1] - difference2 * 0.85
                new_entries.append((entries[i][0], score))
                continue
        new_entries.append(entries[i])
    
    scores = list()
    dictionary = dict(new_entries)
    for line in lines:
        scores.append(dictionary[line])

    return scores
    
    for tuple1, tuple2 in zip(entries, new_entries):
        print(f'[%.2f %.2f] %s' % (tuple1[1], tuple2[1], tuple1[0]))

    return scores

def correct_url(url):
    return re.sub('(\#.+|\?.+)', '', url)