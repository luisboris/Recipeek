import os
import re
import sys

def main():
    """
    preprocess Ingredients and Method file
    erase content before respective title
    """
    for file in os.listdir('database/unparsed'):
        if file.endswith("Ingredients!.txt") and file.startswith('!'):
            with open(f'database/unparsed/{file}', 'r', encoding='utf-8') as r1:
                text = r1.read()
                new_text = ''
                list = 'none'
                for sentence in text.split('\n'):
                    if re.search('^ingredients', sentence, flags=re.I|re.M):
                        list = 'ing'
                    if re.search('^(method|instructions|directions|procedure|preparation)\W*$', sentence, flags=re.I|re.M):
                        list = 'meth'
                    if list == 'ing':
                        new_text += f'{sentence}\n'
                with open(f'database/unparsed/{file}', 'w', encoding='utf-8') as w1:
                    w1.write(new_text)
        if file.endswith("Method!.txt") and file.startswith('!'):
            with open(f'database/unparsed/{file}', 'r', encoding='utf-8') as r2:
                text = r2.read()
                new_text = ''
                list = 'none'
                for sentence in text.split('\n'):
                    if re.search('^(method|instructions|directions|procedure|preparation)\W*$', sentence, flags=re.I|re.M):
                        list = 'meth'
                    if re.search('^ingredients', sentence, flags=re.I|re.M):
                        list = 'ing'
                    if list == 'meth':
                        new_text += f'{sentence}\n'
                with open(f'database/unparsed/{file}', 'w', encoding='utf-8') as w2:
                    w2.write(new_text)

if __name__ == '__main__':
    main()