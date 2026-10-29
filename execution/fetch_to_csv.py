import requests
import csv
import json
import os

def fetch_and_save_csv():
    # 키는 코드에 두지 않는다 (Cloudflare와 같은 이름의 환경변수)
    api_key = os.environ["VISIT_JEJU_KEY"]
    url = f"https://api.visitjeju.net/vsjApi/contents/searchList?locale=kr&category=c5&apiKey={api_key}&pageSize=500"
    
    try:
        print(f"Fetching data from {url}...")
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        items = data.get('items', [])
        
        columns = ['title', 'contentsid', 'address', 'imgpath', 'tags', 'introduction']
        output_file = 'festival_data_review.csv'
        
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()
            
            for item in items:
                imgpath = (item.get('repPhoto', {})
                           .get('photoid', {})
                           .get('imgpath', ''))
                
                writer.writerow({
                    'title': item.get('title', ''),
                    'contentsid': item.get('contentsid', ''),
                    'address': item.get('address', ''),
                    'imgpath': imgpath,
                    'tags': item.get('alltag', ''),
                    'introduction': item.get('introduction', '')
                })
        
        print(f"Successfully saved {len(items)} items to {output_file}")
        return output_file
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    fetch_and_save_csv()
