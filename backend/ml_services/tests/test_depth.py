import unittest
import numpy as np
import sys
import os

# Add parent directory to path to import analysis
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from analysis.wound_analyzer import WoundAnalyzer

class TestDepthEstimation(unittest.TestCase):
    def setUp(self):
        # We don't need real models for testing the logic of estimate_depth
        # since it only uses the image and mask.
        self.analyzer = WoundAnalyzer.__new__(WoundAnalyzer)
        
    def test_estimate_depth_flat(self):
        """Test with a completely flat/uniform image (should have low depth)."""
        image = np.ones((224, 224, 3)) * 0.5 # Grey image
        mask = np.ones((224, 224, 1)) # All wound
        depth = self.analyzer.estimate_depth(image, mask)
        print(f"Flat image depth: {depth}")
        self.assertTrue(0.1 <= depth <= 1.0)

    def test_estimate_depth_shadowed(self):
        """Test with a shadowed/textured image (should have higher depth)."""
        image = np.random.rand(224, 224, 3) * 0.5 # Darker randomized texture
        mask = np.ones((224, 224, 1))
        depth = self.analyzer.estimate_depth(image, mask)
        print(f"Textured image depth: {depth}")
        self.assertGreater(depth, 1.0)

    def test_estimate_depth_empty_mask(self):
        """Test with an empty mask."""
        image = np.ones((224, 224, 3))
        mask = np.zeros((224, 224, 1))
        depth = self.analyzer.estimate_depth(image, mask)
        self.assertEqual(depth, 0.0)

if __name__ == '__main__':
    unittest.main()
