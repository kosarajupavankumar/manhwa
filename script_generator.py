import os
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()

def polish_script(raw_text_file='assets/raw_text.txt', output_file='assets/youtube_script.md'):
    """
    Reads the extracted text and uses Google AI to format it into a Youtube script.
    """
    if not os.path.exists(raw_text_file):
        print(f"Error: Could not find raw text file at {raw_text_file}")
        return None
        
    with open(raw_text_file, 'r', encoding='utf-8') as f:
        raw_text = f.read()
        
    # Mock fallback if no API key is present
    api_key = os.environ.get('GOOGLE_AI_API_KEY')
    if not api_key:
        print("WARNING: No GOOGLE_AI_API_KEY found in environment. Returning a placeholder script.")
        fallback = f"# Youtube Script (Placeholder)\n\nMake sure to set GOOGLE_AI_API_KEY to polish the script.\n\n## Original Text Extracted:\n\n{raw_text}\n"
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fallback)
        return output_file
        
    print("Generating YouTube script using Google AI...")
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an expert YouTube scriptwriter who summarizes comic storylines.
    I will provide you with raw OCR text extracted from multiple Webtoon/Manhwa episodes. 
    It may be messy and out of order.
    
    CRITICAL REQUIREMENT: This video needs to be VERY LONG. You must write an extremely detailed, expansive, and highly-engaging YouTube narrative script that results in at least 30 minutes of spoken voice-over content (this requires generating at least 4,000+ words). 
    
    Do not just summarize; elaborate on the scenes, perform character dialogue, add dramatic pauses, build up the tension, describe the visual actions implied by the text, and maintain a highly engaging storytelling pacing.
    
    Raw Extracted Text:
    {raw_text}
    """
    
    try:
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        script = response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        print("Falling back to ChatGPT (OpenAI)...")
        from openai import OpenAI
        
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            print("WARNING: No OPENAI_API_KEY found! Cannot fallback.")
            return None
            
        openai_client = OpenAI(api_key=openai_key)
        try:
            oai_response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert YouTube scriptwriter who summarizes comic storylines."},
                    {"role": "user", "content": prompt}
                ]
            )
            script = oai_response.choices[0].message.content
        except Exception as oe:
            print(f"OpenAI API Error: {oe}")
            return None
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(script)
        
    print(f"Polished script generated at {output_file}")
    return output_file

if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3:
        polish_script(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python script_generator.py <input_text_file> <output_md_file>")
        print("Example fallback execution if no args provided.")
        polish_script()
