import csv
import os

import tensorflow as tf
from keras.layers import LSTM, Dense, Dropout
from keras.models import Sequential
from tensorflow import keras
from tensorflowjs.converters.converter import tf_saved_model_conversion_v2 as convert


from helpers import *

TEST_SIZE = 0.2    # proportion between test and training data
ING_FILE = 'database/input/ing_x_y.csv'
METH_FILE = 'database/input/meth_x_y.csv'

def main():
    train_model(ING_FILE, 'ing')
    train_model(METH_FILE, 'meth')
    #train_model_combined()

    # convert models to JavaScript
    for model_file in os.listdir('models/saved_model'):
        pass
        # convert.convert_tf_saved_model(f'models/saved_model/{model_file}', f'../Recipick/ts/models/saved_model/{model_file}')


def train_model(file, type):
    (x_train, y_train), (x_test, y_test) = load_data(file) 
    shape = (len(x_train[0]), 1)
    print('-------------------------------------')
    print('SHAPE:', shape, '\nEXAMPLE:', x_train[50], y_train[50])

    model = Sequential()

    model.add(LSTM(128, input_shape=shape, activation='relu', return_sequences=True))
    model.add(Dropout(0.5))

    model.add(LSTM(128, activation='relu'))
    model.add(Dropout(0.3))

    model.add(Dense(32, activation='relu'))
    model.add(Dropout(0.5))

    model.add(Dense(2, activation='softmax'))

    opt = tf.keras.optimizers.Adam(learning_rate=0.001, decay=1e-6)

    model.compile(
        loss='sparse_categorical_crossentropy',
        optimizer=opt,
        metrics=['accuracy'],
    )

    model.fit(x_train, y_train, epochs=3, validation_data=(x_test, y_test))

    model.save(f'models/saved_model/{type}_lines_binary')


def train_model_combined():
    (x_train, y_train), (x_test, y_test) = combine_data() 
    shape = (len(x_train[0]), 1)
    print('-------------------------------------')
    print('SHAPE:', shape, '\nEXAMPLE:', x_train[50], y_train[50])
    
    model = Sequential()

    model.add(LSTM(128, input_shape=shape, activation='relu', return_sequences=True))
    model.add(Dropout(0.5))

    model.add(LSTM(128, activation='relu'))
    model.add(Dropout(0.3))

    model.add(Dense(32, activation='relu'))
    model.add(Dropout(0.5))

    model.add(Dense(3, activation='softmax'))

    opt = tf.keras.optimizers.Adam(learning_rate=0.001, decay=1e-6)

    model.compile(
        loss='sparse_categorical_crossentropy',
        optimizer=opt,
        metrics=['accuracy'],
    )

    model.fit(x_train, y_train, epochs=4, validation_data=(x_test, y_test))

    model.save(f'model/saved_model/combined_lines_categorical')


def load_data(file):
    with open(file, 'r', encoding='utf-8') as r:
        reader = csv.reader(r)
        xx, yy = list(), list()
        for row in reader:
            xx.append([
                int(row[1]),
                int(row[2]),
                float(row[3]),
                float(row[4]),
                float(row[5]),
                float(row[6]),
                float(row[7]),
                float(row[8]),
                float(row[9]),
                int(row[10]),
                int(row[11])
            ])
            yy.append(int(row[-1]))
        
        normalize(xx)

        test_length = int(len(xx) * TEST_SIZE)
        return (xx[:-test_length], yy[:-test_length]), (xx[-test_length:], yy[-test_length:])

def combine_data():
    with open(ING_FILE, 'r', encoding='utf-8') as r1:
        reader1 = csv.reader(r1)
        with open(METH_FILE, 'r', encoding='utf-8') as r2:
            reader2 = csv.reader(r2)
            xx, yy = list(), list()
            for ing_row, meth_row in zip(reader1, reader2):
                # ensure the line is the same
                if ing_row[0] == meth_row[0]:
                    xx.append([
                        int(ing_row[1]),            # length
                        int(ing_row[2]),            # 1st word is a verb
                        float(ing_row[3]),          # ing score
                        float(ing_row[4]),          # neighbor ing score
                        float(ing_row[5]),          #     "     "     "
                        float(ing_row[6]),          #     "     "     "
                        float(ing_row[7]),          #     "     "     "
                        float(ing_row[8]),          #     "     "     "
                        float(ing_row[9]),          #     "     "     "
                        float(meth_row[3]),         # meth score
                        float(meth_row[4]),         # neighbor meth score
                        float(meth_row[5]),         #     "     "     "
                        float(meth_row[6]),         #     "     "     "
                        float(meth_row[7]),         #     "     "     "
                        float(meth_row[8]),         #     "     "     "
                        float(meth_row[9]),         #     "     "     "
                        int(ing_row[10]),           # ing pattern 1
                        int(ing_row[11])            # ing pattern 2
                    ])
                    category = int(meth_row[-1] + ing_row[-1], 2)
                    yy.append(category if category in [0,1,2] else 0)
                else:
                    print('different lines:\n', ing_row[0], '\n', meth_row[0])
                
            normalize(xx)

            test_length = int(len(xx) * TEST_SIZE)
            return (xx[:-test_length], yy[:-test_length]), (xx[-test_length:], yy[-test_length:])



if __name__ == '__main__':
    main()
