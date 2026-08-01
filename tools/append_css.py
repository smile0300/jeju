import codecs

css_append = '''
/* Flatten top corners of table container to connect with tabs */
.lost-table-container {
    border-radius: 0 0 20px 20px !important;
    margin-top: 0 !important;
}
.lost-table th:first-child {
    border-top-left-radius: 0 !important;
}
.lost-table th:last-child {
    border-top-right-radius: 0 !important;
}
'''

# Use 'utf-8' with 'replace' error handler or try cp949 since it's windows
try:
    with codecs.open('src/css/sections.css', 'a', encoding='utf-8') as f:
        f.write(css_append)
except Exception:
    with codecs.open('src/css/sections.css', 'a', encoding='cp949') as f:
        f.write(css_append)

print("Appended table CSS fixes")
