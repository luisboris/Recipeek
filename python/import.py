import os
import re
from itertools import filterfalse
from urllib.request import Request

import html2text
import requests
from bs4 import BeautifulSoup
from pathvalidate import sanitize_filename

from helpers import *


def main():
    # load URLs already in database
    sources = list()
    with open('database/sources.txt') as s:
        sources = s.read().split('\n')
    
    new_sources = url_list()

    for source in new_sources:
        import_(source)
        if correct_url(source) not in sources:
            import_(source)
   

def url_list():
    with open('database/import.txt', encoding='utf-8') as r:
        return r.read().split('\n')

def url_input():
    url = input("url: ")
    return [correct_url(url)]

def import_(source):

    url = correct_url(source)
    
    # get html and text content for each URL
    new_entries = dict()
    try:
        page = requests.get(url)
        soup = BeautifulSoup(page.content, "html.parser")
        req1 = Request(url)
        host = req1.host

        # get content
        h = html2text.HTML2Text()
        h.ignore_links = True
        h.single_line_break = True
        h.skip_internal_links = True
        h.wrap_list_items = False
        h.body_width = False
        h.inline_links = False
        h.emphasis_mark = '_'
        cleaned_text = h.handle(str(soup))

        # clean text
        cleaned_text = re.sub('[#*]', '', cleaned_text)
        cleaned_text = re.sub('\ +', ' ', cleaned_text)
        cleaned_text = re.sub('^[\W]+', '', cleaned_text, flags=re.MULTILINE)
        cleaned_text = re.sub('^.*\[?[0-9]+\].*$', '', cleaned_text, flags=re.MULTILINE)
        cleaned_text = re.sub('(\n *)+', '\n', cleaned_text)
        cleaned_text = re.sub('^[\_\ ]+', '', cleaned_text, flags=re.MULTILINE)
        
        # format divided lines
        lines = cleaned_text.split('\n')
        new_lines = []
        pattern2 = f'^{n_regex} ?$'                                # number alone
        pattern3 = f'^{n_regex}.{{0,2}}({unit_regex})[^a-zA-Z]*$'  # number+unit alone
        i = 0
        while i < len(lines) - 1:
            if re.search(f'({pattern2})|({pattern3})', lines[i]) is not None: 
                # ensure space between lines 
                two = re.sub('  ', ' ', f'{lines[i]} {lines[i+1]}')
                new_lines.append(two)
                i += 2
            else:
                new_lines.append(lines[i])
                i += 1
        
        # index file
        index = next_index(os.listdir('database/parsed'))
        
        # create file with content and a copy to select ingredient list
        with open(f"database/unparsed/!{index}.txt", "w", encoding='utf-8') as f:
            f.write(f'{url}\n\n{cleaned_text}')
        with open(f"database/unparsed/!{index} - Ingredients!.txt", "w", encoding='utf-8') as f:
            f.write(f'{url}\n\n{cleaned_text}')
        with open(f"database/unparsed/!{index} - Method!.txt", "w", encoding='utf-8') as f:
            f.write(f'{url}\n\n{cleaned_text}')

        # update URLs list
        with open('database/sources.txt', 'a') as a:
            a.write(f'{url}\n')

    except Exception as e:
        print('could not parse', url)
        print(e)


if __name__ == '__main__':
    main()
