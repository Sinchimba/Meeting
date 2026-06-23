"""
Training script for Sign Language Recognition models using scikit-learn
"""

import numpy as np
import argparse
from pathlib import Path
import logging
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
import pickle
import json
from datetime import datetime

from config import (
    MODEL_CONFIG, SIGNS, MODEL_PATHS, MODELS_DIR, LOGS_DIR
)
from preprocess import DataProcessor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOGS_DIR / 'training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def generate_synthetic_data(num_samples_per_class=100, sequence_length=30, input_dim=63):
    """
    Generate synthetic landmark sequence data to bootstrap the model.
    Each class has a distinct hand movement signature with added Gaussian noise.
    """
    logger.info("Generating synthetic data for bootstrapping...")
    X_list = []
    y_list = []

    for sign_name, label_id in SIGNS.items():
        # Define a base state for this sign
        base_hand = np.zeros((21, 3))
        # Unique shape per sign
        base_hand[:, 0] = np.linspace(-0.5, 0.5, 21) * np.sin(label_id)
        base_hand[:, 1] = np.linspace(-0.5, 0.5, 21) * np.cos(label_id)
        base_hand[:, 2] = np.linspace(-0.1, 0.1, 21) * np.sin(label_id * 2)

        for _ in range(num_samples_per_class):
            sequence = []
            for t in range(sequence_length):
                # Evolve the pattern over time
                frame = base_hand.copy()
                frame[:, 0] += 0.02 * t * np.sin(label_id)
                frame[:, 1] += 0.02 * t * np.cos(label_id)
                
                # Add tiny Gaussian noise
                frame += np.random.normal(0, 0.02, frame.shape)
                
                sequence.append(frame.flatten())
                
            X_list.append(np.array(sequence).flatten())
            y_list.append(label_id)

    return np.array(X_list), np.array(y_list)


def prepare_data(data_dir, test_size=0.2, val_size=0.1, seed=42):
    """
    Prepare training and validation data, falling back to synthetic data if empty.
    """
    data_dir_path = Path(data_dir)
    has_real_data = False
    
    if data_dir_path.exists() and data_dir_path.is_dir():
        # Check if there's any directory matching the vocabulary
        for subdir in data_dir_path.iterdir():
            if subdir.is_dir() and subdir.name in SIGNS:
                has_real_data = True
                break

    if has_real_data:
        logger.info(f"Loading real training data from {data_dir}")
        processor = DataProcessor(sequence_length=MODEL_CONFIG['sequence_length'])
        X, y = processor.process_video_directory(
            data_dir,
            augment=True,
            augment_count=1
        )
        # Flatten sequences
        X = X.reshape(len(X), -1)
    else:
        logger.info("No real training data found. Bootstrapping with synthetic dataset.")
        X, y = generate_synthetic_data(
            num_samples_per_class=120,
            sequence_length=MODEL_CONFIG['sequence_length']
        )

    logger.info(f"Loaded {len(X)} samples with {len(np.unique(y))} classes")
    
    # Split into train+val and test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )
    
    logger.info(f"Training set: {len(X_train)} samples")
    logger.info(f"Test set: {len(X_test)} samples")
    
    return X_train, X_test, y_train, y_test


def main():
    parser = argparse.ArgumentParser(description='Train Sign Language Recognition Model')
    parser.add_argument('--data-dir', default='data', help='Path to training data directory')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    
    args = parser.parse_args()
    
    # Create models directory if not exists
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Prepare data
    X_train, X_test, y_train, y_test = prepare_data(
        args.data_dir,
        seed=args.seed
    )
    
    # Create scikit-learn MLP classifier
    logger.info("Creating MLPClassifier model")
    model = MLPClassifier(
        hidden_layer_sizes=(256, 128, 64),
        activation='relu',
        solver='adam',
        alpha=0.0001,
        batch_size=min(32, len(X_train)),
        learning_rate_init=0.001,
        max_iter=150,
        random_state=args.seed,
        verbose=True
    )
    
    # Train
    logger.info("Training MLPClassifier...")
    model.fit(X_train, y_train)
    
    # Evaluate
    logger.info("Evaluating on test set...")
    test_acc = model.score(X_test, y_test)
    logger.info(f"Test Accuracy: {test_acc:.4f}")
    
    # Save model
    model_path = MODEL_PATHS['sequence_model']
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    logger.info(f"Model saved to {model_path}")
    
    # Save metadata
    metadata = {
        'model_name': 'sklearn_mlp_model',
        'timestamp': datetime.now().isoformat(),
        'config': MODEL_CONFIG,
        'signs': SIGNS,
        'metrics': {
            'test_accuracy': float(test_acc)
        }
    }
    
    metadata_path = model_path.parent / f'{model_path.stem}_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Metadata saved to {metadata_path}")
    
    logger.info("Training complete!")


if __name__ == '__main__':
    main()
