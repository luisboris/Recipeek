import re
import os
import csv

from helpers import *

def main():
    # read vectors and tokens files into dictionaries
    ing_tokens, meth_tokens, maxs = load_data()
    ing_vectors, meth_vectors = list(), list()
    
    # check for files with LISTS parsed
    folder = os.listdir('database/parsed')
    for file in folder:
        if re.search('[0-9]+.txt', file) is not None:
            original = load_sentences(f'database/parsed/{file}')
            
            ing_file = re.sub('.txt', ' - Ingredients.txt', file)
            if ing_file in folder:
                ingredients = load_sentences(f'database/parsed/{ing_file}')
                data = vectorize(original, ing_tokens)
                binary_labels = vectorize_yy_binary(original, ingredients)

                for sentence, x, y in zip(original, data, binary_labels):
                    ing_vectors.append([sentence] + x + [y])
                    # max of all
                    if x[0] > int(maxs[0]):
                        maxs[0] = x[0]
                    if x[0] > int(maxs[1]) and y == 1:
                        maxs[1] = x[0]
            
                labels_file = re.sub('.txt', ' labels.txt', ing_file)
                with open(f'database/parsed/{labels_file}', 'w') as r:
                    r.write(str(binary_labels))
                
            meth_file = re.sub('.txt', ' - Method.txt', file)
            if meth_file in folder:
                method = load_sentences(f'database/parsed/{meth_file}')
                data = vectorize(original, meth_tokens)
                binary_labels = vectorize_yy_binary(original, method)

                for sentence, x, y in zip(original, data, binary_labels):
                    meth_vectors.append([sentence] + x + [y])
                    if x[0] > int(maxs[2]) and y == 1:
                        maxs[2] = x[0]
                
                labels_file = re.sub('.txt', ' labels.txt', meth_file)
                with open(f'database/parsed/{labels_file}', 'w') as r:
                    r.write(str(binary_labels))

    # check feedback lines
    vectorize_feedback(ing_tokens, meth_tokens, ing_vectors, meth_vectors)

    save_data(ing_vectors, meth_vectors)


### FUNCTIONS
def load_data():
    ing_tokens, meth_tokens = dict(), dict()
    with open('database/tokens/ing_tokens.csv', 'r') as r3:
        reader3 = csv.reader(r3)
        ing_tokens = {row[0]: int(row[1]) for row in reader3}
    with open('database/tokens/meth_tokens.csv', 'r') as r4:
        reader4 = csv.reader(r4)
        meth_tokens = {row[0]: int(row[1]) for row in reader4}
    
    maxs = list()
    with open('database/maxs.txt', 'r') as r5:
        maxs = r5.read().split('\n')

    return ing_tokens, meth_tokens, maxs
    

def save_data(ing_vectors, meth_vectors):
    """
    Save data for each Neural Network (1. Sentences, 2. Webpages)
    """
    with open(f'database/input/ing_x_y.csv', 'w', newline='', encoding='utf-8') as r1:
        writer = csv.writer(r1)
        for vector in ing_vectors:
            writer.writerow(vector)
    with open(f'database/input/meth_x_y.csv', 'w', newline='', encoding='utf-8') as r2:
        writer = csv.writer(r2)
        for vector in meth_vectors:
            writer.writerow(vector)
        
def load_sentences(file):
    with open(file, 'r', encoding='utf-8') as f1:
        return f1.read().split('\n')

def vectorize_yy_binary(original, list):
    result = []
    # TODO clean false positives???
    for i in range(len(original)):
        result.append(
            1 if original[i] in list else 0
        )
    return result

def vectorize_feedback(ing_tokens, meth_tokens, ing_vectors, meth_vectors):         
    ing_lines = load_sentences('database/feedback/ing_misses.txt') + load_sentences('database/feedback/ing_lines.txt')
    meth_lines = load_sentences('database/feedback/meth_misses.txt') + load_sentences('database/feedback/meth_lines.txt')
    lines = ing_lines + meth_lines
   
    ing_data = vectorize(lines, ing_tokens)
    meth_data = vectorize(lines, meth_tokens)
    ing_binary_labels = [1] * len(ing_lines) + [0] * len(meth_lines)

    for line, x_i, x_m, y in zip(lines, ing_data , meth_data, ing_binary_labels):
        ing_vectors.append([line] + x_i + [y])
        meth_vectors.append([line] + x_m + [1 - y])


if __name__ == '__main__':
    main()