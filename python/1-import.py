from itertools import filterfalse
import re
import os
from urllib.request import Request
from pathvalidate import sanitize_filename
import html2text

import requests
from bs4 import BeautifulSoup
from helpers import n_regex, unit_regex

def main():
    url()
   

def sources():
     # load URLs already in database
    with open('sources.txt') as s:
        sources = s.read().split('\n')
        for link in sources:
            url(link, len(sources))

def url():
    # check if user has given a file with urls
    url = input("url: ")

    # load URLs already in database
    with open('sources.txt') as s:
        if url in s.read().split('\n'):
            pass#return
    
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
        cleaned_text = re.sub('(\n *)+', '\n', cleaned_text)
        cleaned_text = re.sub('\ +', ' ', cleaned_text)
        cleaned_text = re.sub('^[\W]+', '', cleaned_text, flags=re.MULTILINE)

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
                print(two)
                new_lines.append(two)
                i += 2
            else:
                new_lines.append(lines[i])
                i += 1
        
        # index file
        filename = 0
        n = re.match('[0-9]+', max(os.listdir('database/parsed') + os.listdir('database/unparsed')))
        length = len(n[0])
        for i in range(length):
            if f'{i}.txt' not in os.listdir('database/unparsed') and f'{i}.txt' not in os.listdir('database/parsed'):
                filename = str(i).zfill(length)
        
        # create file with content and a copy to select ingredient list
        with open(f"database/unparsed/{filename}.txt", "w", encoding='utf-8') as f:
            f.write(f'{url}\n\n{cleaned_text}')
        with open(f"database/unparsed/!{filename} - Ingredients!.txt", "w", encoding='utf-8') as f:
            f.write(f'{url}\n\n{cleaned_text}')

        # update URLs list
        with open('sources.txt', 'a') as a:
            a.write(f'{url}\n')

    except Exception as e:
        print('could not parse', url)
        print(e)


if __name__ == '__main__':
    main()
