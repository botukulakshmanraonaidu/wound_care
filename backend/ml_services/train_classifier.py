import os
import matplotlib.pyplot as plt
from utils import download_dataset
from preprocessing.data_loader import load_and_preprocess_dataset, get_data_generators
from classification.model import create_wound_classifier

def plot_history(history, save_path="classification_metrics.png"):
    """
    Plots training and validation accuracy and loss.
    """
    acc = history.history.get('accuracy', [])
    val_acc = history.history.get('val_accuracy', [])
    loss = history.history.get('loss', [])
    val_loss = history.history.get('val_loss', [])

    epochs = range(1, len(acc) + 1)

    plt.figure(figsize=(12, 5))
    
    # Accuracy plot
    plt.subplot(1, 2, 1)
    plt.plot(epochs, acc, 'b-', label='Training accuracy')
    plt.plot(epochs, val_acc, 'r-', label='Validation accuracy')
    plt.title('Training and validation accuracy')
    plt.legend()

    # Loss plot
    plt.subplot(1, 2, 2)
    plt.plot(epochs, loss, 'b-', label='Training loss')
    plt.plot(epochs, val_loss, 'r-', label='Validation loss')
    plt.title('Training and validation loss')
    plt.legend()

    plt.tight_layout()
    plt.savefig(save_path)
    print(f"Metrics plot saved to {save_path}")

def main():
    # 1. Download dataset (Put the actual Google Drive link here)
    gdrive_url = "https://drive.google.com/file/d/1i0VJcrv2wNmmtCfTCxmD2wnkoYrzUJev/view?usp=sharing"
    dataset_dir = download_dataset(gdrive_url, dest_folder="dataset")
    
    # 2. Load dataset
    print("\nLoading and preprocessing data...")
    X_train, X_val, y_train, y_val, classes = load_and_preprocess_dataset(dataset_dir)
    num_classes = len(classes)
    
    # 3. Augment data
    print("\nApplying data augmentation...")
    train_gen, val_gen = get_data_generators(X_train, X_val, y_train, y_val, batch_size=32)
    
    # 4. Initialize model (MobileNetV2 based)
    print("\nInitializing MobileNetV2 Classification Model...")
    model = create_wound_classifier(input_shape=(224, 224, 3), num_classes=num_classes)
    model.summary()
    
    # 5. Train model
    epochs = 30 # Change as needed
    print(f"\nTraining for {epochs} epochs...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=epochs,
    )
    
    # 6. Show / Save accuracy and loss plots
    plot_history(history, save_path="training_metrics.png")
    
    # 7. Save model
    models_dir = "models"
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
    
    model_path = os.path.join(models_dir, "wound_classifier.keras")
    model.save(model_path)
    print(f"\nModel successfully saved at {model_path}")

if __name__ == "__main__":
    main()
