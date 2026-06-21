"""
Training script for Sign Language Recognition models
"""

import numpy as np
import argparse
from pathlib import Path
import logging
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import pickle
import json
from datetime import datetime

from config import (
    MODEL_CONFIG, SIGNS, MODEL_PATHS, MODELS_DIR, LOGS_DIR,
    DATA_AUGMENTATION
)
from models import (
    create_sequence_recognition_model,
    create_cnn_lstm_model,
    create_attention_model,
    get_model_summary
)
from preprocess import DataProcessor
from utils import plot_training_history, create_checkpoint_dir

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


def prepare_data(data_dir, test_size=0.2, val_size=0.1, seed=42):
    """
    Prepare training and validation data.
    
    Args:
        data_dir: Directory containing training data
        test_size: Fraction of data for testing
        val_size: Fraction of training data for validation
        seed: Random seed
    
    Returns:
        Tuple of (X_train, X_val, X_test, y_train, y_val, y_test)
    """
    logger.info(f"Loading data from {data_dir}")
    
    processor = DataProcessor(sequence_length=MODEL_CONFIG['sequence_length'])
    
    # Process all data
    X, y = processor.process_video_directory(
        data_dir,
        augment=True,
        augment_count=1
    )
    
    logger.info(f"Loaded {len(X)} samples with {len(np.unique(y))} classes")
    
    # Split into train+val and test
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )
    
    # Split train+val into train and val
    val_size_adjusted = val_size / (1 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=val_size_adjusted, random_state=seed, stratify=y_temp
    )
    
    logger.info(f"Training set: {len(X_train)} samples")
    logger.info(f"Validation set: {len(X_val)} samples")
    logger.info(f"Test set: {len(X_test)} samples")
    
    return X_train, X_val, X_test, y_train, y_val, y_test


def train_model(model, X_train, y_train, X_val, y_val, model_name='sequence_model'):
    """
    Train a model.
    
    Args:
        model: Keras model to train
        X_train: Training features
        y_train: Training labels
        X_val: Validation features
        y_val: Validation labels
        model_name: Name for saving checkpoints
    
    Returns:
        Training history
    """
    logger.info(f"Training {model_name}")
    logger.info(model.summary())
    
    # Create checkpoint directory
    checkpoint_dir = create_checkpoint_dir(model_name)
    
    # Callbacks
    from tensorflow.keras.callbacks import (
        ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, TensorBoard
    )
    
    callbacks = [
        ModelCheckpoint(
            str(checkpoint_dir / 'best_model.h5'),
            monitor='val_accuracy',
            save_best_only=True,
            mode='max',
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        ),
        TensorBoard(
            log_dir=str(LOGS_DIR / model_name),
            histogram_freq=1,
            update_freq='epoch'
        )
    ]
    
    # Train
    history = model.fit(
        X_train, y_train,
        batch_size=MODEL_CONFIG['batch_size'],
        epochs=MODEL_CONFIG['epochs'],
        validation_data=(X_val, y_val),
        callbacks=callbacks,
        verbose=1
    )
    
    return history


def evaluate_model(model, X_test, y_test):
    """
    Evaluate model on test set.
    
    Args:
        model: Trained model
        X_test: Test features
        y_test: Test labels
    
    Returns:
        Dictionary of evaluation metrics
    """
    logger.info("Evaluating on test set")
    
    test_loss, test_acc, test_precision, test_recall = model.evaluate(
        X_test, y_test, verbose=0
    )
    
    metrics = {
        'test_loss': float(test_loss),
        'test_accuracy': float(test_acc),
        'test_precision': float(test_precision),
        'test_recall': float(test_recall),
        'f1_score': float(2 * (test_precision * test_recall) / (test_precision + test_recall))
    }
    
    logger.info(f"Test Accuracy: {test_acc:.4f}")
    logger.info(f"Test Precision: {test_precision:.4f}")
    logger.info(f"Test Recall: {test_recall:.4f}")
    logger.info(f"Test F1-Score: {metrics['f1_score']:.4f}")
    
    return metrics


def save_model(model, history, metrics, model_name='sequence_model'):
    """
    Save trained model and metadata.
    
    Args:
        model: Trained model
        history: Training history
        metrics: Evaluation metrics
        model_name: Name for saving
    """
    # Save model
    model_path = MODEL_PATHS['sequence_model'] if model_name == 'sequence_model' else MODELS_DIR / f'{model_name}.h5'
    model.save(str(model_path))
    logger.info(f"Model saved to {model_path}")
    
    # Save metadata
    metadata = {
        'model_name': model_name,
        'timestamp': datetime.now().isoformat(),
        'config': MODEL_CONFIG,
        'signs': SIGNS,
        'metrics': metrics,
        'training_epochs': len(history.history['loss'])
    }
    
    metadata_path = model_path.parent / f'{model_path.stem}_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Metadata saved to {metadata_path}")


def main():
    parser = argparse.ArgumentParser(description='Train Sign Language Recognition Model')
    parser.add_argument('--data-dir', required=True, help='Path to training data directory')
    parser.add_argument('--model-type', default='lstm', choices=['lstm', 'cnn_lstm', 'attention'],
                        help='Type of model to train')
    parser.add_argument('--epochs', type=int, default=None, help='Number of epochs')
    parser.add_argument('--batch-size', type=int, default=None, help='Batch size')
    parser.add_argument('--augment', action='store_true', help='Enable data augmentation')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    
    args = parser.parse_args()
    
    # Update config if provided
    if args.epochs:
        MODEL_CONFIG['epochs'] = args.epochs
    if args.batch_size:
        MODEL_CONFIG['batch_size'] = args.batch_size
    
    logger.info(f"Configuration: {MODEL_CONFIG}")
    
    # Prepare data
    X_train, X_val, X_test, y_train, y_val, y_test = prepare_data(
        args.data_dir,
        seed=args.seed
    )
    
    # Create model
    logger.info(f"Creating {args.model_type} model")
    if args.model_type == 'lstm':
        model = create_sequence_recognition_model(
            sequence_length=MODEL_CONFIG['sequence_length'],
            input_shape=21 * 3,
            num_classes=MODEL_CONFIG['num_classes'],
            lstm_units=MODEL_CONFIG['lstm_units'],
            dropout_rate=MODEL_CONFIG['dropout_rate']
        )
    elif args.model_type == 'cnn_lstm':
        model = create_cnn_lstm_model(
            sequence_length=MODEL_CONFIG['sequence_length'],
            input_shape=21 * 3,
            num_classes=MODEL_CONFIG['num_classes'],
            lstm_units=MODEL_CONFIG['lstm_units'],
            dropout_rate=MODEL_CONFIG['dropout_rate']
        )
    else:  # attention
        model = create_attention_model(
            sequence_length=MODEL_CONFIG['sequence_length'],
            input_shape=21 * 3,
            num_classes=MODEL_CONFIG['num_classes'],
            lstm_units=MODEL_CONFIG['lstm_units'],
            dropout_rate=MODEL_CONFIG['dropout_rate']
        )
    
    # Train
    history = train_model(
        model, X_train, y_train, X_val, y_val,
        model_name=f'{args.model_type}_model'
    )
    
    # Evaluate
    metrics = evaluate_model(model, X_test, y_test)
    
    # Save
    save_model(model, history, metrics, model_name=f'{args.model_type}_model')
    
    # Plot history
    plot_training_history(history, output_dir=LOGS_DIR)
    
    logger.info("Training complete!")


if __name__ == '__main__':
    main()
