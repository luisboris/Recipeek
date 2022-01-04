import re
import os
import nltk
import csv
import itertools

from nltk import tokenize
from helpers import *


def main():
    
    ing_tokens  = load_tokens('ing')
    meth_tokens = load_tokens('meth')
    
    # get new tokens from unparsed files
    files_parsed = []
    for file in os.listdir('database/unparsed'):
        if file.endswith("Ingredients.txt") and file.startswith('!'):
            update_tokens(f'database/unparsed/{file}', ing_tokens)
            files_parsed.append(file)
        if file.endswith("Method.txt") and file.startswith('!'):
            update_tokens(f'database/unparsed/{file}', meth_tokens)
            files_parsed.append(file)
    
    # get new tokens from feedback
    tokenize_feedback(ing_tokens, meth_tokens)

    # update token files
    update_csv(ing_tokens, meth_tokens)
    
    # unflag unparsed files
    for file in files_parsed:
        new_name = file.replace('!', '')
        os.rename(f'database/unparsed/{file}', f'database/unparsed/{new_name}')  
    
    # move files parsed to parsed folder
    move()
    
    # update tokens in .js file
    jstokens(ing_tokens, meth_tokens)

### FUNCTIONS            
def load_tokens(type):
    tokens = dict()
    with open(f'database/tokens/{type}_tokens.csv', 'r') as r:
        reader = csv.reader(r)
        for row in reader:
            tokens[row[0]] = int(row[1])
    return tokens

def update_tokens(file, tokens, score=1):
    for sentence in get_sentences(file):
        for word in get_tokens(sentence):
            if word in tokens:
                tokens[word] = tokens[word] + score
            else:
                tokens[word] = score
            # delete tokens with no score
            if tokens[word] < 1:
                tokens.pop(word)

def update_csv(ing_tokens, meth_tokens):
    """
    Count tokens frequency in descending order
    """
    for type in ['ing', 'meth']:
        tokens = ing_tokens if type == 'ing' else meth_tokens
        words = list(tokens.keys())
        words.sort(reverse=True, key=lambda word: tokens[word])
        with open(f'database/tokens/{type}_tokens.csv', 'w', newline='') as w:
            writer = csv.writer(w, delimiter=',')
            for word in words:
                writer.writerow([word, tokens[word]])
        
def get_sentences(file):
    with open(file, encoding='utf-8') as f:
        sentences = []
        for sentence in f.read().split('\n'):
            
            # ignore empty lines
            if re.search('[a-zA-Z]', sentence) is None:
                continue
            
            # clean unwanted symbols
            sentences.append(re.sub('^[\W]+', '', sentence))
    
    return sentences

def tokenize_feedback(ing_tokens, meth_tokens):
    update_tokens('database/feedback/unparsed/ing_lines.txt', ing_tokens, score=1)
    update_tokens('database/feedback/unparsed/meth_lines.txt', ing_tokens, score=1)
    update_tokens('database/feedback/unparsed/ing_misses.txt', ing_tokens, score=1)
    update_tokens('database/feedback/unparsed/meth_misses.txt', meth_tokens, score=1)
    update_tokens('database/feedback/unparsed/ing_mistakes.txt', ing_tokens, score=-1)
    update_tokens('database/feedback/unparsed/meth_mistakes.txt', meth_tokens, score=-1)
    
    # transfer parsed lines and empty unparsed files
    for file in os.listdir('database/feedback/unparsed'):
        with open(f'database/feedback/unparsed/{file}', 'r', encoding='utf-8') as r:
            lines = r.read()
            with open(f'database/feedback/{file}', 'a', encoding='utf-8') as a:
                a.write(lines)
        open(f'database/feedback/unparsed/{file}', 'w', encoding='utf-8').close()

def move():
    for file in os.listdir('database/unparsed'):
        try:
            # check for both ingredients and method parsed
            num = re.search('[0-9]+', file)[0]
            if f'{num} - Ingredients.txt' in os.listdir('database/unparsed') and f'{num} - Method.txt' in os.listdir('database/unparsed'):
                os.rename(f'database/unparsed/{num}.txt', f'database/parsed/{num}.txt')
                os.rename(f'database/unparsed/{num} - Ingredients.txt', f'database/parsed/{num} - Ingredients.txt')
                os.rename(f'database/unparsed/{num} - Method.txt', f'database/parsed/{num} - Method.txt')
        except Exception as e:
            print(e, '\ncould not move', file)

def jstokens(ing_tokens, meth_tokens):
    """
    Save tokens in js syntax and indentation
    Save only tokens with score > 1
    """
    with open('../chrome-extension/background.js', 'r', encoding='utf-8') as r:
        js_file = r.read()
        string = """
function setTokens() {
    chrome.storage.local.set({ tokens: {
        ing: { 
            """

        # write ing tokens
        count = 0
        for token in ing_tokens:
            if ing_tokens[token] > 1:
                string += f'"{token}": {ing_tokens[token]}, '
                count += 1
                if count % 5 == 0:
                    string += '\n\t\t\t'
        
        string += """
        },
        meth: {
            """

        # write meth tokens
        count = 0
        for token in meth_tokens:
            if meth_tokens[token] > 1:
                string += f'"{token}": {meth_tokens[token]}, '
                count += 1
                if count % 5 == 0:
                    string += '\n\t\t\t'
        
        string += """
        }
	} });
}
        """

        js_file = re.sub('\nfunction.+', string, js_file, flags=re.DOTALL)

    with open('../chrome-extension/background.js', 'w', encoding='utf-8') as w:
        w.write(js_file)


if __name__ == '__main__':
    main()