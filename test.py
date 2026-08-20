import re, io
f=io.open('src/parts/features/lost-found.html', 'r', encoding='utf-8')
text=f.read()
f.close()

def replace_input(match):
    full_match = match.group(0)
    # Hide the original input
    hidden_input = full_match.replace('class="lost-form-file-input"', 'class="lost-form-file-input" style="display:none;"')
    
    # Create the custom wrapper
    # Using a general translation key for upload button
    custom_html = f"""<label class="custom-file-upload-btn">
    {hidden_input}
    <i class="ph-duotone ph-upload-simple"></i> <span data-i18n="modal.lost.upload_btn">사진 파일 선택</span>
</label>"""
    return custom_html

text = re.sub(r'<input[^>]*type=[\"\']file[\"\'][^>]*>', replace_input, text)

f=io.open('src/parts/features/lost-found.html', 'w', encoding='utf-8')
f.write(text)
f.close()
