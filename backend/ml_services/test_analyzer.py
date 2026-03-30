import sys
import traceback

def test():
    try:
        from ai_api import get_analyzer
        print("Testing get_analyzer()...")
        analyzer = get_analyzer()
        print("Successfully created analyzer.")
    except Exception as e:
        print("Exception caught:")
        print(traceback.format_exc())

if __name__ == "__main__":
    test()
