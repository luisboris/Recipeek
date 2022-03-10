import csv
import os
import subprocess

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
    ing_data = load_data(ING_FILE) 
    ing_model = train_model(ing_data, 3, 2)
    meth_data = load_data(METH_FILE) 
    meth_model = train_model(meth_data, 3, 2)
    combined_data = combine_data()
    combined_model = train_model(combined_data, 4, 3)

    info = []
    with open('models/info.csv', 'r') as r:
        reader = csv.reader(r)
        for row in reader:
            info.append(row)
            print(f'\nMODEL %s ................' % row[0])
            print(f'%s %.3f %.3f' % (row[1], float(row[2]), float(row[3])))
            print(f'%s %.3f %.3f' % (row[4], float(row[5]), float(row[6])))
            print(f'%s %.3f %.3f' % (row[7], float(row[8]), float(row[9])))

    action = input('\nSAVE? - save\nOVERWRITE? - over\nNOTHING? - no\n')
    while action not in ['save', 'over', 'no']:
        action = input('SAVE? - save\nOVERWRITE? - over\nNOTHING? - no\n')
    if action == 'no':
        return

    # next index
    folder = os.listdir('models/saved_model')
    index = len(folder) + 1    
    if action == 'over':
        index -= 1

    new_row = [
        index, 
        'ing', 
        ing_model['history'].history['loss'][-1], 
        ing_model['history'].history['accuracy'][-1],
        'meth', 
        meth_model['history'].history['loss'][-1], 
        meth_model['history'].history['accuracy'][-1],
        'combined', 
        combined_model['history'].history['loss'][-1], 
        combined_model['history'].history['accuracy'][-1]
    ]
    if action == 'over':
        info[-1] = new_row
    if action == 'save':
        info.append(new_row)

    print(new_row)

    with open('models/info.csv', 'w', newline='') as r:
        writer = csv.writer(r)
        for row in info:
            writer.writerow(row)

        
    ing_model['model'].save(f'models/saved_model/{index}/ing_lines_binary')
    meth_model['model'].save(f'models/saved_model/{index}/meth_lines_binary')
    combined_model['model'].save(f'models/saved_model/{index}/combined_lines_categorical')

    # convert models to JavaScript
    subprocess.run(["tensorflowjs_converter", "--input_format=tf_saved_model", "--output_node_names='js'", "--saved_model_tags=serve", f"--control_flow_v2=true models/saved_model/{index}/ing_lines_binary", f"../extension/models/saved_model_{index}/ing_lines_binary"])
    subprocess.run(["tensorflowjs_converter", "--input_format=tf_saved_model", "--output_node_names='js'", "--saved_model_tags=serve", f"--control_flow_v2=true models/saved_model/{index}/meth_lines_binary", f"../extension/models/saved_model_{index}/meth_lines_binary"])
    subprocess.run(["tensorflowjs_converter", "--input_format=tf_saved_model", "--output_node_names='js'", "--saved_model_tags=serve", f"--control_flow_v2=true models/saved_model/{index}/combined_lines_categorical", f"../extension/models/saved_model_{index}/combined_lines_categorical"])


def train_model(data, epochs, n_output):
    (x_train, y_train), (x_test, y_test) = data
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

    model.add(Dense(n_output, activation='softmax'))

    opt = tf.keras.optimizers.Adam(learning_rate=0.001, decay=1e-6)

    model.compile(
        loss='sparse_categorical_crossentropy',
        optimizer=opt,
        metrics=['accuracy'],
    )

    history = model.fit(x_train, y_train, epochs=epochs, validation_data=(x_test, y_test))

    return dict({ 'model': model, 'history': history })

def load_data(file):
    with open(file, 'r', encoding='utf-8') as r:
        reader = csv.reader(r)
        xx, yy = list(), list()
        for row in reader:
            xx.append([
                float(row[1]),
                float(row[2]),
                float(row[3]),
                float(row[4]),
                float(row[5]),
                float(row[6]),
                float(row[7]),
                float(row[8]),
                float(row[9]),
                float(row[10]),
                float(row[11]),
            ])
            yy.append(int(row[-1]))
        
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
                        float(ing_row[1]),          # length
                        float(ing_row[2]),          
                        float(ing_row[3]),            # ing pattern 1
                        float(ing_row[4]),            # ing pattern 2
                        float(ing_row[5]),          # ing score
                        float(ing_row[6]),          # neighbor ing score
                        float(ing_row[7]),          #     "     "     "
                        float(ing_row[8]),          #     "     "     "
                        float(ing_row[9]),          #     "     "     "
                        float(ing_row[10]),         #     "     "     "
                        float(ing_row[11]),         #     "     "     "
                        float(meth_row[5]),         # meth score
                        float(meth_row[6]),         # neighbor meth score
                        float(meth_row[7]),         #     "     "     "
                        float(meth_row[8]),         #     "     "     "
                        float(meth_row[9]),         #     "     "     "
                        float(meth_row[10]),         #     "     "     "
                        float(meth_row[11]),        #     "     "     "
                    ])
                    category = int(meth_row[-1] + ing_row[-1], 2)
                    yy.append(category if category in [0,1,2] else 0)
                else:
                    print('different lines:\n', ing_row[0], '\n', meth_row[0])
                
            test_length = int(len(xx) * TEST_SIZE)
            return (xx[:-test_length], yy[:-test_length]), (xx[-test_length:], yy[-test_length:])



if __name__ == '__main__':
    main()
