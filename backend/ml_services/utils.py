import os
import zipfile
import gdown

def download_dataset(url, dest_folder="dataset"):
    """
    Downloads a ZIP dataset from Google Drive and extracts it.
    """
    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)
        
    zip_path = os.path.join(dest_folder, "dataset.zip")
    
    # Check if we already extracted folders
    expected_folders = ["Abrasions", "Bruises", "Burns", "Cut", "Laceration"]
    extracted = any(
        os.path.exists(os.path.join(dest_folder, f)) or 
        os.path.exists(os.path.join(dest_folder, "dataset", f)) # Handling nested zip output
        for f in expected_folders
    )
    
    if extracted:
        print("Dataset already looks downloaded and extracted.")
        return dest_folder

    if not os.path.exists(zip_path):
        print(f"Downloading dataset from {url}...")
        try:
            # Fuzzy=True helps download even from regular Google Drive link instead of raw download link
            gdown.download(url, zip_path, quiet=False, fuzzy=True)
            print("Download completed.")
        except Exception as e:
            print(f"Failed to download dataset. Ensure gdown is installed and URL is accessible.\nError: {e}")
            return dest_folder
            
    print("Extracting dataset...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(dest_folder)
        print("Extraction completed.")
    except zipfile.BadZipFile:
        print("Error: The downloaded file is not a valid zip file. Please check the URL.")

    return dest_folder
