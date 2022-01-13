import re
import os
import nltk
import numpy as np
import tensorflow as tf
from tensorflow import keras
from helpers import *
import csv
#from keras.preprocessing.sequence import TimeseriesGenerator
from keras.layers import LSTM, Dense, Dropout
from keras.models import Sequential 


ING_FILE = 'database/input/ing_x_y.csv'
METH_FILE = 'database/input/meth_x_y.csv'

def main():
    n = input('file #')

    ing_model = keras.models.load_model('models/saved_model/ing_lines_binary')
    meth_model = keras.models.load_model('models/saved_model/meth_lines_binary')
    combined_model = keras.models.load_model('models/saved_model/combined_lines_categorical')

    # Evaluate the restored model - TODO
    #ing_test_lines, ing_test_labels = load_evaluation_data()
    #loss, acc = ing_model.evaluate(test_lines, test_labels, verbose=1)
    #print('Restored model, accuracy: {:5.2f}%'.format(100 * acc))
    #loss, acc = ing_model.evaluate(test_lines, test_labels, verbose=1)
    #print('Restored model, accuracy: {:5.2f}%'.format(100 * acc))
    

    # make prediction
    ing_prediction_lines = load_input_data(n, 'ing')
    ing_prediction = ing_model.predict(ing_prediction_lines)

    meth_prediction_lines = load_input_data(n, 'meth')
    meth_prediction = meth_model.predict(meth_prediction_lines)

    combined_prediction_lines = combine_data(ing_prediction_lines, meth_prediction_lines)
    combined_prediction = combined_model.predict(combined_prediction_lines)
    
    # get results
    ing_result = [
        0 if max(prediction) == prediction[0] else 1
        for prediction in ing_prediction
    ]
    print('INGREDIENTS PREDICTION\nINPUT SHAPE:', np.array(ing_prediction_lines).shape)
    print_prediction(n, ing_prediction, ing_result)

    meth_result = [
        0 if max(prediction) == prediction[0] else 1
        for prediction in meth_prediction
    ]
    print('METHOD PREDICTION\nINPUT SHAPE:', np.array(meth_prediction_lines).shape)
    print_prediction(n, meth_prediction, meth_result)

    combined_result = [
        prediction.tolist().index(max(prediction)) 
        for prediction in combined_prediction
    ]
    print('COMBINED PREDICTION\nINPUT SHAPE:', np.array(combined_prediction_lines).shape)
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
            file_vectors = vectorize(r2.read().split('\n'), tokens)
            normalize(file_vectors)
            return file_vectors

def combine_data(ing, meth):
    return [
        [ ing_row[0],    # length
        ing_row[1],      # ing score
        ing_row[2],      # neighbor ing score
        ing_row[3],      #     "     "     "
        ing_row[4],      #     "     "     "
        ing_row[5],      #     "     "     "
        ing_row[6],      #     "     "     "
        ing_row[7],      #     "     "     "
        meth_row[1],     # meth score
        meth_row[2],     # neighbor meth score
        meth_row[3],     #     "     "     "
        meth_row[4],     #     "     "     "
        meth_row[5],     #     "     "     "
        meth_row[6],     #     "     "     "
        meth_row[7],     #     "     "     "
        ing_row[8],      # title pattern
        ing_row[9],      # ing pattern 1
        ing_row[10],     # ing pattern 2
        meth_row[9] ]    # meth pattern
        for ing_row, meth_row in zip(ing, meth)
    ]

def print_prediction(n, prediction, result):
    print('------------------------------------------------')
    with open(f'database/unparsed/!{n}.txt', 'r', encoding='utf-8') as r:
        for pred, res, line in zip(prediction, result, r.read().split('\n')):
            if res != 0:
               print(pred, line)
    print('------------------------------------------------')


if __name__ == '__main__':
    main()