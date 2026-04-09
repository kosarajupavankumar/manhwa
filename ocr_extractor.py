import os
import PIL.Image
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()
import pytesseract

def extract_text_from_images(image_paths, output_file='assets/raw_text.txt'):
    """
    Given a list of image paths, runs OCR using Gemini to extract text/dialogue.
    Falls back to Tesseract if Gemini fails.
    """
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    all_text = []
    
    api_key = os.environ.get('GOOGLE_AI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    use_gemini = bool(api_key)
    if use_gemini:
        try:
            client = genai.Client(api_key=api_key)
            gemini_available = True
        except Exception as e:
            print(f"Gemini setup failed: {e}. Falling back to Tesseract.")
            gemini_available = False
    else:
        print("No GOOGLE_AI_API_KEY found. Using Tesseract OCR.")
        gemini_available = False
    
    print(f"Extracting text from {len(image_paths)} images using {'Gemini' if gemini_available else 'Tesseract'}...")
    
    if gemini_available:
        # Process images in chunks of 15 to avoid overloading the API
        chunk_size = 15
        for i in range(0, len(image_paths), chunk_size):
            chunk_paths = image_paths[i:i+chunk_size]
            print(f"  [OCR] Processing image chunk {i+1} to {min(i+chunk_size, len(image_paths))}...")
            
            contents = ["You are an OCR tool. Please extract the dialogue and text from these consecutive comic panels in exact reading order. Only output the text and dialogue, nothing else."]
            try:
                for path in chunk_paths:
                    img = PIL.Image.open(path)
                    contents.append(img)
                    
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=contents
                )
                
                if response.text:
                    all_text.append(response.text.strip())
            except Exception as e:
                # Fallback to Tesseract for this chunk
                for path in chunk_paths:
                    try:
                        img = PIL.Image.open(path)
                        text = pytesseract.image_to_string(img)
                        filtered_lines = [line.strip() for line in text.split('\n') if line.strip()]
                        if filtered_lines:
                            all_text.extend(filtered_lines)
                    except Exception as e2:
                        print(f"    [!] Tesseract also failed for {path}: {e2}")
    else:
        # Use Tesseract for all
        for path in image_paths:
            try:
                img = PIL.Image.open(path)
                text = pytesseract.image_to_string(img)
                filtered_lines = [line.strip() for line in text.split('\n') if line.strip()]
                if filtered_lines:
                    all_text.extend(filtered_lines)
                else:
                    print(f"No text detected in {path}")
            except Exception as e:
                print(f"Failed to process {path}: {e}")
            
    final_text = "\n".join(all_text)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(final_text)
        
    print(f"Extracted {len(all_text)} lines of text to {output_file}")
    return output_file
        
    print(f"Extracted text to {output_file}")
    return output_file

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # If folder is passed, extract all images in folder
        folder = sys.argv[1]
        imgs = [os.path.join(folder, f) for f in os.listdir(folder) if f.endswith('.jpg') or f.endswith('.png')]
        extract_text_from_images(sorted(imgs))
    else:
        print("Usage: python ocr_extractor.py <folder_of_images>")
