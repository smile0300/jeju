import re

with open('src/js/lost-found.v1.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace window.currentLanguage with (localStorage.getItem('jeju_lang') || 'zh')
js = js.replace("window.currentLanguage || 'zh'", "(localStorage.getItem('jeju_lang') || 'zh')")

with open('src/js/lost-found.v1.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated currentLanguage to localStorage")
