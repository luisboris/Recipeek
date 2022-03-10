import os
import re
import spacy
import nltk
import csv
from helpers import *
import subprocess

def main():
    ttt()


def ttt():
    vectors = list()
    with open('database/input/ing_x_y.csv', newline='', encoding='utf-8') as r2:
        reader = csv.reader(r2)
        for row in reader:
            vectors.append(row)
    with open('database/input/ing_x_y_readable.txt', 'w', encoding='utf-8') as rr2:
        writer = csv.writer(r2)
        for vector in vectors:
            length = re.sub('(?<=\.[0-9]{2})([0-9]+)', '', vector[1]+'0')
            ints = vector[2:5]
            scores = [re.sub('(?<=\.[0-9]{2})([0-9]+)', '', v+'0') for v in vector[5:-1]]
            yy = vector[-1]
            readable = [length] + ints + scores + [yy]
            line = f'[{", ".join(readable)}]   {vector[0]}\n'
            rr2.write(line)

def verbs():
    with open(f'database/unparsed/!00.txt', 'r', encoding='utf-8') as r:
        sentences = r.read().split('\n')
        
        nlp = spacy.load('en_core_web_sm')
        print(nlp.pipe_names)
        for sentence in sentences:
            doc = list(nlp(sentence))
            if doc and doc[0].pos_ == 'VERB':
                print(doc[0].pos_, sentence)

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
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        content = re.sub('^.*\[?[0-9]+\].*$', '', content, flags=re.MULTILINE)
        content = re.sub('^[\_\ ]+', '', content, flags=re.MULTILINE)
        content = content = re.sub('(\n *)+', '\n', content)
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