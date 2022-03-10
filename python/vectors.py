import re
import os
import csv
import sys

from helpers import *


def main():
    # read vectors and tokens files into dictionaries
    ing_tokens, meth_tokens = load_tokens()
    ing_vectors, meth_vectors = list(), list()
    ing_data, meth_data = list(), list()
    ing_labels, meth_labels = list(), list()
    all_lines = list()

    choice = sys.argv[1] if len(sys.argv) == 2 else None
    choice_list = list()
    
    # check for files with LISTS parsed
    folder = os.listdir('database/parsed')
    
    # number of recipes parsed
    length = 0
    for file in folder:
        if re.search('[0-9]+.txt', file):
            length += 1
    i = 1

    for file in folder:
        if re.search('[0-9]+.txt', file):
            ing_file = re.sub('.txt', ' - Ingredients.txt', file)
            meth_file = re.sub('.txt', ' - Method.txt', file)
            if ing_file not in folder or meth_file not in folder:
                continue

            lines = load_lines(f'database/parsed/{file}')
            all_lines += lines
            ingredients = load_lines(f'database/parsed/{ing_file}')
            method = load_lines(f'database/parsed/{meth_file}')
            
            ing_data += vectorize(lines, ing_tokens)
            ing_labels += vectorize_yy_binary(lines, ingredients)
            meth_data += vectorize(lines, meth_tokens)
            meth_labels += vectorize_yy_binary(lines, method)

            print(f'PROCESSED {i} of {length} -', file)
            i += 1

            if i == 1000:
                break

    print('FINISHING...')
    normalize(ing_data)
    normalize(meth_data)
    for line, ingX, methX, ingY, methY in zip(all_lines, ing_data, meth_data, ing_labels, meth_labels):
        ing_vectors.append([line, *ingX, ingY])
        meth_vectors.append([line, *methX, methY])
    save_data(ing_vectors, meth_vectors)


### FUNCTIONS
def load_tokens():
    ing_tokens, meth_tokens = dict(), dict()
    with open('database/tokens/ing_tokens.csv', 'r') as r3:
        reader3 = csv.reader(r3)
        ing_tokens = {row[0]: int(row[1]) for row in reader3}
    with open('database/tokens/meth_tokens.csv', 'r') as r4:
        reader4 = csv.reader(r4)
        meth_tokens = {row[0]: int(row[1]) for row in reader4}
    
    return ing_tokens, meth_tokens
    
def load_lines(file):
    with open(file, 'r', encoding='utf-8') as f1:
        return [
            line for line in f1.read().split('\n')
            if ']: ' not in line
        ]

def vectorize2(lines, tokens, all_scores):    
    words = list(get_tokens(line) for line in lines)
    meth_classes = list(has_meth_classes(line) for line in lines)
    scores = list(get_score(line_words, tokens) for line_words in words)
    all_scores += scores

    print('MAX SCORE:', max(scores))

    scores = smoothScore(lines, scores)

    # create vector for each line
    # [length; 1st word is a verb; score; neighbor_scores(3 before + 3 after); patterns]
    padded_scores = [0, 0, 0] + scores + [0, 0, 0]
    vectors = []
    for i in range(len(lines)):
        # TODO check for unwanted symbols or spaces in beggining of line
        # TODO check consistey with JS patterns
        vectors.append([
            len(words[i]),
            meth_classes[i],
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

def vectorize_yy_binary(original_lines, list_lines):
    yy = list()
    sequence = '00'
    for i in range(len(original_lines)):
        y = 1 if original_lines[i] in list_lines else 0
        yy.append(y)
        sequence += str(y)
    
    # clean false positives
    sequence += '00'
    for j in range(len(sequence)):
        if sequence[j:j+5] == '00100':
            yy[j] = 0

    return yy

def smoothAllScores(lines, scores, vectors):
    entries = list(sorted(zip(lines, scores), key=lambda item: float(item[1])))

    filtered = scores.copy()
    filtered = list(filter(lambda x: x>=10, filtered))

    average = sum(filtered) / len(filtered)
    max = entries[-1][1]
    window = max - average

    new_entries = list()
    for i in range(len(entries)):
        if entries[i][1] >= 10 and i > 0:
            difference = entries[i][1] - new_entries[i-1][1]
            deviation = (entries[i][1] - average) / window if window else 0
            down = difference * deviation
            score = entries[i][1] - down
            new_entries.append((entries[i][0], score))
        else:
            new_entries.append(entries[i])
    
    new_scores = list()
    dictionary = dict(new_entries)
    for line in lines:
        new_scores.append(dictionary[line])
    
    for i in range(len(vectors)):
        vectors[i][5] = new_scores[i]
    
def save_data(ing_vectors, meth_vectors):
    """
    Save data for each Neural Network (1. lines, 2. Webpages)
    """
    with open('database/input/ing_x_y.csv', 'w', newline='', encoding='utf-8') as r1:
        with open('database/input/ing_x_y_readable.txt', 'w', encoding='utf-8') as rr1:
            writer = csv.writer(r1)
            for vector in ing_vectors:
                writer.writerow(vector)
                
                readable = f'[{vector[0]:.2f}, {vector[1]}, {vector[2]}, {vector[3]}, '
                for v in vector[4:-1]:
                    readable += f'{v:.2f}, '
                readable += f'{vector[-1]}] {vector[0]}\n'
                rr1.write(readable)

    with open('database/input/meth_x_y.csv', 'w', newline='', encoding='utf-8') as r2:
        with open('database/input/meth_x_y_readable.txt', 'w', encoding='utf-8') as rr2:
            writer = csv.writer(r2)
            for vector in meth_vectors:
                writer.writerow(vector)
                
                readable = f'[{vector[0]:.2f}, {vector[1]}, {vector[2]}, {vector[3]}, '
                for v in vector[4:-1]:
                    readable += f'{v:.2f}, '
                readable += f'{vector[-1]}] {vector[0]}\n'
                rr2.write(readable)

        
def sub_data(index, choice_list, type):
    inputs = list()
    with open(f'database/input/{type}_x_y.csv', 'r', encoding='utf-8') as r1:
        reader = csv.reader(r1)
        inputs = [row for row in reader]

    with open(f'database/input/{type}_x_y.csv', 'w', newline='', encoding='utf-8') as w1:
        with open(f'database/input/{type}_x_y_readable.txt', 'w', encoding='utf-8') as ww1:
            writer = csv.writer(w1)
            for vector, value in zip(inputs, choice_list):
                vector[index] = value
                writer.writerow(vector)
                
                readable = list()
                for v in vector[1:]:
                    value = round(float(v), 2)
                    readable.append(value)
                ww1.write(f'{readable}  {vector[0]}\n')

if __name__ == '__main__':
    main()