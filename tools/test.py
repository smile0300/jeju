import urllib.request
from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_select = False
        self.in_option = False
        self.current_value = ""

    def handle_starttag(self, tag, attrs):
        if tag == "select":
            for attr in attrs:
                if attr[0] == "id" and attr[1] == "fdLctCd":
                    self.in_select = True
        elif tag == "option" and self.in_select:
            self.in_option = True
            for attr in attrs:
                if attr[0] == "value":
                    self.current_value = attr[1]

    def handle_endtag(self, tag):
        if tag == "select":
            self.in_select = False
        elif tag == "option" and self.in_option:
            self.in_option = False

    def handle_data(self, data):
        if self.in_option and self.current_value:
            if "부산" in data or "서울" in data or "제주" in data or "L" in self.current_value:
                print(f"{self.current_value} : {data.strip()}")

url = 'https://minwon24.police.go.kr/cvlcpt/cvlcptAply.do?cvlcptId=MW-201'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        parser = MyHTMLParser()
        parser.feed(html)
except Exception as e:
    print(e)
