import re
from sys import flags
from helpers import *


def main():
    """
    Save feedback lines in respective files
    Empty feedback file
    """
    with open('database/feedback/feedback.txt', encoding='utf-8') as r:
        text = r.read()
        parse_feedback_errors('ing_lines', text)
        parse_feedback_errors('meth_lines', text)
        parse_feedback_errors('ing_mistakes', text)
        parse_feedback_errors('meth_mistakes', text)
        parse_feedback_errors('ing_misses', text)
        parse_feedback_errors('meth_misses', text)
    open('database/feedback/feedback.txt', 'w', encoding='utf-8').close()
    

    with open('database/feedback/feedback2.txt', encoding='utf-8') as r2:
        with open('database/sources.txt', 'a+') as s:
            sources = s.read().split('\n')

            pages = re.findall("\.\n\.\n(http.+?$)\n\.\.all\.\.\n(.+?)\n\.\.ing\.\.\n(.+?)\n\.\.meth\.\.\n(.+?)\n\.\.end\.\.", r2.read(), flags=re.DOTALL|re.MULTILINE)
            for page in pages:
                url = page[0]
                if url not in sources:
                    sources.append(url)
                    s.write(url + '\n')

                    all_lines = page[1]
                    ing_lines = page[2]
                    meth_lines = page[3]

                    index = next_index('database/parsed')
                    with open(f'database/parsed/{index}.txt', 'w', encoding='utf-8') as file:
                        file.write(url + '\n' + all_lines)
                    with open(f'database/parsed/{index} - Ingredients.txt', 'w', encoding='utf-8') as ing:
                        ing.write(ing_lines)
                    with open(f'database/parsed/{index} - Method.txt', 'w', encoding='utf-8') as meth:
                        meth.write(meth_lines)

    open('database/feedback/feedback2.txt', 'w').close()

def parse_feedback_errors(type, text):
    finds = re.search(f"(?:{type}\n)(.*?)(?:\n\n)", text, flags=re.DOTALL)
    if finds:
        lines = re.sub('\n*$', '', finds.group(1))
        if re.search('\w', lines):
            with open(f'database/feedback/unparsed/{type}.txt', 'a', encoding='utf-8') as a:
                a.write(lines)



if __name__ == '__main__':
    main()