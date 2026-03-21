import json
import csv
import sys

def main():
    # stdin에서 JSON을 읽거나 파일을 읽음
    try:
        data = json.load(sys.stdin)
        items = data.get('items', [])
        
        # CSV 컬럼 정의
        columns = ['title', 'contentsid', 'address', 'imgpath', 'tags']
        
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
                    'tags': item.get('alltag', '')
                })
        
        print(f"Successfully created {output_file} with {len(items)} items.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
