import os
import re
from helpers import *

def main():
    unglad()
    
def unglad():
    for file in os.listdir('database/unparsed'):
        if file.startswith('!'):
            new_name = re.sub('!', '', file, 1)
            os.rename(f'database/unparsed/{file}', f'database/unparsed/{new_name}')

def analyse():
    ### count how many stopwords in method section
    stopwords = nltk.corpus.stopwords.words("english")
    phrases = []
    counts = []
    for file in os.listdir('database/parsed'):
        if file.startswith('!'):
            pass
    with open(f'database/parsed/0005.txt', encoding='utf-8') as r:
        for sentence in r.read().split('\n'):
            words = nltk.tokenize.word_tokenize(sentence.lower())
            if len(words) == 0:
                continue
            targets = [word for word in words if word in stopwords]
            phrase = f'{len(targets)} in {len(words)} --- {len(targets) / len(words)}\n'
            phrases.append(phrase)
            counts.append(len(targets) / len(words))
            print(len(targets) / len(words), '---', sentence)
    
    print('MIN:', min(counts))
    print('MAX:', max(counts))
    print('AVG:', (sum(counts) / len(counts)))



def clean(file):
    print(file)
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        content = content = re.sub('(\n *)+', '\n', content)
        content = re.sub('\ +', ' ', content)
        content = re.sub('^[\W]+', '', content, flags=re.MULTILINE)
        with open(file, 'w', encoding='utf-8') as w:
            w.write(content)

def reader(file):
    if re.search('[0-9].txt', file):
        with open(f'database/parsed/{file}', 'r', encoding='utf-8') as f:
            for line in f.read().split('\n'):
                if re.search(title_pattern, line):
                    print(line)
    
def joint():
    a =  ['tsp', 'tsps', 'teaspoons', 'teaspoon', 'tbsp', 'tb', 'tbsps', 'tablespoons', 'tablespoon', 
    'cups', 'cup', 'c',
    'lb', 'pounds', 'pound', 'pd', 'ounce', 'ounces', 'oz', 
    'gram', 'grams', 'gr', 'g', 'kilogram', 'kilograms', 'kgs', 'kg', 'miligram', 'miligrams', 'mg', 'mgs',
    'ml', 'mls', 'mililitre', 'mililiter', 'mililitres', 'mililiters', 
    'cl', 'cls', 'centiliter', 'centilitre', 'centiliter', 'centilitre',
    'dl', 'dls', 'decilitre', 'deciliter', 'decilitres', 'deciliters',
    'l', 'ls', 'litres', 'liters', 'litre', 'liter',
    'fl oz', 'quarts', 'quart', 'qt', 'gallons', 'gallon', 'pints', 'pint',
    'inch', 'inches', 'in', 
    'cm', 'cms', 'centimeter', 'centimetre', 'centimeters', 'centimetres', 
    'mm', 'mms', 'milimitre', 'milimiter', 'milimitres', 'milimiters',
    'large', 'small', 'medium', 'bunch', 'handfull', 'pinch', 'sprinkle']
    b = ''
    for unit in a:
        b = b+'|'+unit
    print(b)


if __name__ == '__main__':
    main()