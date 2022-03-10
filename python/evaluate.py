import csv
import os
import re

import numpy as np
import tensorflow as tf
from keras.layers import LSTM, Dense, Dropout
from keras.models import Sequential
from tensorflow import keras

from helpers import *

ING_FILE = 'database/input/ing_x_y.csv'
METH_FILE = 'database/input/meth_x_y.csv'

def main():
    n = input('file # ')

    model_n = input('model # ')
    if model_n == '':
        model_n = len(os.listdir('models/saved_model'))

    ing_model = keras.models.load_model(f'models/saved_model/{model_n}/ing_lines_binary')
    meth_model = keras.models.load_model(f'models/saved_model/{model_n}/meth_lines_binary')
    combined_model = keras.models.load_model(f'models/saved_model/{model_n}/combined_lines_categorical')

    # Evaluate the restored model - TODO
    #ing_test_lines, ing_test_labels = load_evaluation_data()
    #loss, acc = ing_model.evaluate(test_lines, test_labels, verbose=1)
    #print('Restored model, accuracy: {:5.2f}%'.format(100 * acc))
    #loss, acc = ing_model.evaluate(test_lines, test_labels, verbose=1)
    #print('Restored model, accuracy: {:5.2f}%'.format(100 * acc))
    

    # make prediction
    ing_prediction_vectors = load_input_data(n, 'ing')
    ing_prediction = ing_model.predict(ing_prediction_vectors)
    ing_result = [
        0 if max(prediction) == prediction[0] else 1
        for prediction in ing_prediction
    ]
    print('\n\nINGREDIENTS PREDICTION\nINPUT SHAPE:', np.array(ing_prediction_vectors).shape)
    print_prediction(n, ing_prediction, ing_result)

    meth_prediction_vectors = load_input_data(n, 'meth')
    meth_prediction = meth_model.predict(meth_prediction_vectors)
    meth_result = [
        0 if max(prediction) == prediction[0] else 1
        for prediction in meth_prediction
    ]
    print('\n\nMETHOD PREDICTION\nINPUT SHAPE:', np.array(meth_prediction_vectors).shape)
    print_prediction(n, meth_prediction, meth_result)

    combined_prediction_vectors = combine_data(ing_prediction_vectors, meth_prediction_vectors)
    combined_prediction = combined_model.predict(combined_prediction_vectors)
    combined_result = [
        prediction.tolist().index(max(prediction)) 
        for prediction in combined_prediction
    ]
    for p, v, l in zip(combined_result, combined_prediction_vectors, combined_prediction):
        pass
    print('\n\nCOMBINED PREDICTION\nINPUT SHAPE:', np.array(combined_prediction_vectors).shape)
    print_prediction(n, combined_prediction, combined_result)



def load_evaluation_data():
    tokens = dict()
    with open('database/tokens/ing_tokens.csv', 'r') as r2:
        reader2 = csv.reader(r2)
        tokens = {row[0]: int(row[1]) for row in reader2}
    lines = list()
    labels = list()
    for file in os.listdir('database/parsed'):
        if re.search('^[0-9]+\.txt', file):
            n = file.replace('.txt', '')
            with open(f'database/parsed/{file}', 'r', encoding='utf-8') as r1:
                # make vectors from every sentence in file
                file_vectors = vectorize(r1.read().split('\n'), tokens)
                normalize(file_vectors)
                with open(f'database/parsed/{n} - Ingredients labels.txt', 'r', encoding='utf-8') as r2:
                    file_labels = [int(ch) for ch in r2.read()]
                    # ensure lines and labels are the same length
                    if len(file_vectors) == len(file_labels):
                        lines = lines + file_vectors
                        labels = labels + file_labels
    return lines, labels

def load_input_data(n, type):
    with open(f'database/tokens/{type}_tokens.csv', 'r') as r1:
        reader1 = csv.reader(r1)
        tokens = {row[0]: int(row[1]) for row in reader1}
        with open(f'database/unparsed/!{n}.txt', 'r', encoding='utf-8') as r2:
            lines = r2.read().split('\n')
            file_vectors = vectorize(lines, tokens)
            normalize(file_vectors)

            for w, v in zip(lines, file_vectors):
                #print(v, w)
                print(f'[%d, %d, %d, %.2f]' % (v[1],v[2],v[3],v[4]), w)

            return file_vectors

def combine_data(ing, meth):
    return [
        [ float(ing_row[0]),        # length
        int(ing_row[1]),          # 1st word is a verb
        int(ing_row[2]),            # ing pattern 1
        int(ing_row[3]),            # ing pattern 2
        float(ing_row[4]),          # ing score
        float(ing_row[5]),          # neighbor ing score
        float(ing_row[6]),          #     "     "     "
        float(ing_row[7]),          #     "     "     "
        float(ing_row[8]),          #     "     "     "
        float(ing_row[9]),          #     "     "     "
        float(ing_row[10]),         #     "     "     "
        float(meth_row[4]),         # meth score
        float(meth_row[5]),         # neighbor meth score
        float(meth_row[6]),         #     "     "     "
        float(meth_row[7]),         #     "     "     "
        float(meth_row[8]),         #     "     "     "
        float(meth_row[9]),         #     "     "     "
        float(meth_row[10]) ]       #     "     "     "
        for ing_row, meth_row in zip(ing, meth)
    ]

def print_prediction(n, prediction, result):
    print('------------------------------------------------')
    with open(f'database/unparsed/!{n}.txt', 'r', encoding='utf-8') as r:
        previous = None
        for pred, res, line in zip(prediction, result, r.read().split('\n')):
            if res != 0:
                if len(pred) == 3:
                    list = 'ING LIST' if max(pred) == pred[1] else 'METH LIST'
                    if previous != list:
                        print('\n' + list)
                        previous = list
                    print("%.2f" % max(pred), '--', line)
                else:
                    print("%.2f" % max(pred), '--', line)
    print('------------------------------------------------')


if __name__ == '__main__':
    main()
