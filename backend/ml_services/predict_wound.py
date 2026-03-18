import os
import argparse
import json
from analysis.wound_analyzer import WoundAnalyzer

def main():
    parser = argparse.ArgumentParser(description="Analyze a wound image using MediWound AI pipeline.")
    parser.add_argument("--image", type=str, required=True, help="Path to the wound image.")
    args = parser.parse_args()

    # Paths to the trained models
    # Assumes run from mediwound_ai root folder
    model_dir = "models"
    classifier_path = os.path.join(model_dir, "wound_classifier.h5")
    segmentation_path = os.path.join(model_dir, "wound_segmentation_model.h5")

    # Check if models exist
    if not os.path.exists(classifier_path) or not os.path.exists(segmentation_path):
        print(f"Error: Models not found in {model_dir}/.")
        print("Please train the models first using train_classifier.py and train_segmentation.py.")
        return

    # Check image
    if not os.path.exists(args.image):
        print(f"Error: Image {args.image} not found.")
        return

    try:
        # Initialize analyzer
        analyzer = WoundAnalyzer(
            classifier_path=classifier_path,
            segmentation_path=segmentation_path
        )

        # Analyze
        print(f"Analyzing {args.image} ...\n")
        results, img, mask = analyzer.analyze_wound(args.image)

        # Print structured JSON result
        print("### ANALYSIS RESULT ###")
        print(json.dumps(results, indent=4))
        print("#######################")

        # Visualize prediction and mask overlay
        print("Opening visualization dashboard...")
        analyzer.visualize_result(img, mask, results)

    except Exception as e:
        print(f"An error occurred during analysis: {e}")

if __name__ == "__main__":
    main()
