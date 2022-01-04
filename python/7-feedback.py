import re


def main():
    """
    Save feedback lines in respective files
    Empty feedback file
    """
    with open('database/feedback/feedback.txt', encoding='utf-8') as r:
        text = r.read()
        parse_feedback('ing_lines', text)
        parse_feedback('meth_lines', text)
        parse_feedback('ing_mistakes', text)
        parse_feedback('meth_mistakes', text)
        parse_feedback('ing_misses', text)
        parse_feedback('meth_misses', text)
    open('database/feedback/feedback.txt', 'w', encoding='utf-8').close()


def parse_feedback(type, text):
    lines = re.search(f"(?:{type}\n)(.*?)(?:\n\n)", text, flags=re.DOTALL).group(1)
    if re.search('\w', lines):
        with open(f'database/feedback/unparsed/{type}.txt', 'a', encoding='utf-8') as a:
            a.write(lines)

if __name__ == '__main__':
    main()